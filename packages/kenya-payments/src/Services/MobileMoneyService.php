<?php

namespace Sledeci\KenyaPayments\Services;

use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;
use App\Models\MessageLog;
use Sledeci\KenyaPayments\Models\MobileMoneyRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Sledeci\Core\Contracts\PaymentGateway;

/**
 * MobileMoneyService
 *
 * Handles:
 *  - M-Pesa Daraja API v2 STK Push (Kenya / Safaricom)
 *  - Airtel Money API (Kenya / Uganda / Tanzania / Ghana)
 *  - MTN MoMo API (Ghana / Uganda / Cameroon / others)
 *  - Webhook reconciliation for all three providers
 *  - Automatic payment recording on successful callback
 */
class MobileMoneyService implements PaymentGateway
{
    // ── PaymentGateway contract ────────────────────────────────────────────────

    public function name(): string
    {
        return 'mpesa';
    }

    /**
     * Start an M-Pesa STK push for an invoice (the only flow the contract exposes today).
     *
     * The invoice is taken from $context['invoice'] when the caller already has it,
     * otherwise it is found by number from $reference. The returned array carries the
     * contract keys (success, reference, message) plus the provider fields
     * (checkout_request_id, merchant_request_id, response_description) that the UI uses.
     *
     * @param  array<string, mixed>  $context
     * @return array{success: bool, reference: ?string, message: ?string}
     *
     * @throws \RuntimeException when the provider rejects the request
     */
    public function initiate(string $phone, float $amount, string $reference, array $context = []): array
    {
        $invoice = $context['invoice'] ?? Invoice::where('number', $reference)->firstOrFail();

        $result = $this->mpesaStkPush($invoice, $phone, $amount);

        return [
            'success'   => true,
            'reference' => $result['checkout_request_id'] ?? null,
            'message'   => $result['response_description'] ?? null,
            ...$result,
        ];
    }

    // ── Provider-specific API ──────────────────────────────────────────────────

    /**
     * Callback URL for a named webhook route, with the shared secret attached.
     */
    private function callbackUrl(string $routeName): string
    {
        $secret = (string) config('services.webhooks.secret');

        return route($routeName, $secret !== '' ? ['token' => $secret] : []);
    }

    /**
     * Remember an outbound payment request so its callback can be matched.
     */
    private function trackRequest(Invoice $invoice, string $channel, string $externalId, float $amount, ?string $phone, array $extra = []): MobileMoneyRequest
    {
        return MobileMoneyRequest::create([
            'invoice_id'          => $invoice->id,
            'channel'             => $channel,
            'external_id'         => $externalId,
            'merchant_request_id' => $extra['merchant_request_id'] ?? null,
            'phone'               => $phone,
            'amount'              => $amount,
            'status'              => 'pending',
        ]);
    }

    /**
     * Find the still-pending request a callback refers to (null if unknown/already handled).
     */
    private function pendingRequest(string $channel, ?string $externalId): ?MobileMoneyRequest
    {
        if (! $externalId) {
            return null;
        }

        return MobileMoneyRequest::where('channel', $channel)
            ->where('external_id', $externalId)
            ->where('status', 'pending')
            ->first();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // M-Pesa (Safaricom Daraja)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initiate M-Pesa STK push.
     * Prompts the customer's phone with a PIN popup.
     *
     * @param  Invoice  $invoice
     * @param  string   $phone  Format: 254XXXXXXXXX (no + prefix)
     * @param  float|null $amount  Override amount (uses invoice amount_due by default)
     */
    public function mpesaStkPush(Invoice $invoice, string $phone, ?float $amount = null): array
    {
        $token     = $this->mpesaToken();
        $shortcode = config('services.mpesa.shortcode');
        $passkey   = config('services.mpesa.passkey');
        $timestamp = now()->format('YmdHis');
        $password  = base64_encode($shortcode . $passkey . $timestamp);
        $amount    = (int) ceil($amount ?? $invoice->amountDue());
        $phone     = $this->normalizeMpesaPhone($phone);

        $response = Http::withToken($token)
            ->timeout(30)
            ->post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', [
                'BusinessShortCode' => $shortcode,
                'Password'          => $password,
                'Timestamp'         => $timestamp,
                'TransactionType'   => 'CustomerPayBillOnline',
                'Amount'            => $amount,
                'PartyA'            => $phone,
                'PartyB'            => $shortcode,
                'PhoneNumber'       => $phone,
                'CallBackURL'       => $this->callbackUrl('webhooks.mpesa.callback'),
                'AccountReference'  => $invoice->number,
                'TransactionDesc'   => "Payment for {$invoice->number}",
            ]);

        $data = $response->json();

        Log::info('M-Pesa STK push initiated', [
            'invoice'  => $invoice->id,
            'phone'    => $phone,
            'response' => $data,
        ]);

        if (($data['ResponseCode'] ?? '') !== '0') {
            throw new \RuntimeException(
                'M-Pesa STK push failed: ' . ($data['errorMessage'] ?? $data['ResponseDescription'] ?? 'Unknown error')
            );
        }

        $this->trackRequest($invoice, 'mpesa', $data['CheckoutRequestID'], (float) $amount, $phone, [
            'merchant_request_id' => $data['MerchantRequestID'] ?? null,
        ]);

        return [
            'checkout_request_id' => $data['CheckoutRequestID'],
            'merchant_request_id' => $data['MerchantRequestID'],
            'response_description'=> $data['ResponseDescription'],
        ];
    }

    /**
     * Handle M-Pesa STK push callback (POST from Safaricom).
     * Validates the payload and records the payment.
     */
    public function handleMpesaCallback(array $payload): void
    {
        $body = $payload['Body']['stkCallback'] ?? [];
        $code = $body['ResultCode'] ?? -1;

        // The callback only carries CheckoutRequestID — match it to the request we initiated.
        $request = $this->pendingRequest('mpesa', $body['CheckoutRequestID'] ?? null);
        if (! $request) {
            Log::warning('M-Pesa STK callback ignored: unknown or already-processed CheckoutRequestID', [
                'checkout_request_id' => $body['CheckoutRequestID'] ?? null,
            ]);
            return;
        }

        if ((int) $code !== 0) {
            Log::warning('M-Pesa STK push failed by customer', ['payload' => $payload]);
            $request->update(['status' => 'failed', 'payload' => $payload, 'completed_at' => now()]);
            return;
        }

        $items     = collect($body['CallbackMetadata']['Item'] ?? [])->keyBy('Name');
        $mpesaCode = data_get($items, 'MpesaReceiptNumber.Value');
        $amount    = (float) data_get($items, 'Amount.Value');
        $phone     = (string) data_get($items, 'PhoneNumber.Value');

        if (! $mpesaCode) {
            Log::error('M-Pesa STK callback success without receipt number', ['payload' => $payload]);
            return;
        }

        if (abs($amount - (float) $request->amount) > 0.01) {
            Log::warning('M-Pesa STK callback amount differs from request', [
                'requested' => (float) $request->amount, 'received' => $amount,
            ]);
        }

        $this->recordMobilePayment($request->invoice, [
            'channel'             => 'mpesa',
            'amount'              => $amount,
            'mobile_money_code'   => $mpesaCode,
            'mobile_money_phone'  => $phone,
            'mobile_money_payload'=> $payload,
            'reference'           => $mpesaCode,
        ]);

        $request->update(['status' => 'completed', 'payload' => $payload, 'completed_at' => now()]);
    }

    /**
     * Handle M-Pesa C2B (pay-bill / till) confirmation callback.
     */
    public function handleMpesaC2BConfirmation(array $payload): void
    {
        $mpesaCode = $payload['TransID'] ?? null;
        $amount    = (float) ($payload['TransAmount'] ?? 0);
        $phone     = $payload['MSISDN'] ?? null;
        $ref       = $payload['BillRefNumber'] ?? null;

        if (! $mpesaCode) return;

        // Idempotency: skip if already recorded
        if (Payment::where('mobile_money_code', $mpesaCode)->exists()) {
            return;
        }

        $invoice = Invoice::where('number', $ref)->first();
        if (! $invoice) {
            Log::warning('M-Pesa C2B: no matching invoice', ['ref' => $ref, 'code' => $mpesaCode]);
            return;
        }

        $this->recordMobilePayment($invoice, [
            'channel'             => 'mpesa',
            'amount'              => $amount,
            'mobile_money_code'   => $mpesaCode,
            'mobile_money_phone'  => $phone,
            'mobile_money_payload'=> $payload,
            'reference'           => $mpesaCode,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Airtel Money
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initiate Airtel Money collection request.
     * Works across KE, UG, TZ, GH with the same API.
     */
    public function airtelCollect(Invoice $invoice, string $phone, string $countryCode = 'KE'): array
    {
        $token    = $this->airtelToken();
        $ref      = Str::uuid()->toString();
        $amount   = (int) ceil($invoice->amountDue());
        $currency = match ($countryCode) {
            'KE' => 'KES', 'UG' => 'UGX', 'TZ' => 'TZS', 'GH' => 'GHS', default => 'KES',
        };

        $response = Http::withToken($token)
            ->timeout(30)
            ->post('https://openapi.airtel.africa/merchant/v1/payments/', [
                'reference'   => $ref,
                'subscriber'  => [
                    'country'  => $countryCode,
                    'currency' => $currency,
                    'msisdn'   => $phone,
                ],
                'transaction' => [
                    'amount'   => $amount,
                    'country'  => $countryCode,
                    'currency' => $currency,
                    'id'       => $ref,
                ],
            ]);

        $data = $response->json();

        if (($data['status']['code'] ?? '') !== '200') {
            throw new \RuntimeException(
                'Airtel Money request failed: ' . ($data['status']['message'] ?? 'Unknown error')
            );
        }

        $this->trackRequest($invoice, 'airtel_money', $ref, (float) $amount, $phone);

        return ['reference' => $ref, 'transaction_id' => $data['data']['transaction']['id'] ?? null];
    }

    /**
     * Handle Airtel Money payment notification callback.
     */
    public function handleAirtelCallback(array $payload): void
    {
        $transaction = $payload['transaction'] ?? [];
        $status      = strtoupper((string) ($transaction['status_code'] ?? $transaction['status'] ?? ''));

        // Our own UUID is sent as transaction.id, so it identifies the request.
        $request = $this->pendingRequest('airtel_money', $transaction['id'] ?? null);
        if (! $request) {
            Log::warning('Airtel callback ignored: unknown or already-processed transaction', [
                'id' => $transaction['id'] ?? null,
            ]);
            return;
        }

        if ($status !== 'TS') {
            if ($status === 'TF') {
                $request->update(['status' => 'failed', 'payload' => $payload, 'completed_at' => now()]);
            }
            return;
        }

        $airtelRef = $transaction['airtel_money_id'] ?? $transaction['id'];

        $this->recordMobilePayment($request->invoice, [
            'channel'             => 'airtel_money',
            'amount'              => (float) $request->amount,   // trust our request, not the payload
            'mobile_money_code'   => $airtelRef,
            'mobile_money_phone'  => $transaction['msisdn'] ?? $request->phone,
            'mobile_money_payload'=> $payload,
            'reference'           => $airtelRef,
        ]);

        $request->update(['status' => 'completed', 'payload' => $payload, 'completed_at' => now()]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MTN MoMo
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initiate MTN MoMo request-to-pay.
     */
    public function mtnRequestToPay(Invoice $invoice, string $phone, string $countryCode = 'GH'): array
    {
        $token    = $this->mtnToken();
        $ref      = Str::uuid()->toString();
        $amount   = (string) (int) ceil($invoice->amountDue());
        $currency = match ($countryCode) {
            'GH' => 'GHS', 'UG' => 'UGX', 'CM' => 'XAF', default => 'GHS',
        };

        Http::withHeaders([
            'Authorization'                 => "Bearer {$token}",
            'X-Reference-Id'               => $ref,
            'X-Target-Environment'         => config('services.mtn_momo.environment', 'sandbox'),
            'X-Callback-Url'               => $this->callbackUrl('webhooks.mtn.callback'),
            'Ocp-Apim-Subscription-Key'    => config('services.mtn_momo.subscription_key'),
        ])->timeout(30)
          ->post('https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay', [
            'amount'       => $amount,
            'currency'     => $currency,
            'externalId'   => $ref,
            'payer'        => ['partyIdType' => 'MSISDN', 'partyId' => $phone],
            'payerMessage' => "Payment for {$invoice->number}",
            'payeeNote'    => $invoice->number,
        ]);

        $this->trackRequest($invoice, 'mtn_momo', $ref, (float) $amount, $phone);

        return ['reference_id' => $ref];
    }


    /**
     * Handle an MTN MoMo callback. The posted payload is NOT trusted: we only use
     * its externalId (our request UUID) and confirm the outcome with MTN's API.
     */
    public function handleMtnCallback(array $payload): void
    {
        $request = $this->pendingRequest('mtn_momo', $payload['externalId'] ?? null);
        if (! $request) {
            Log::warning('MTN callback ignored: unknown or already-processed request', [
                'externalId' => $payload['externalId'] ?? null,
            ]);
            return;
        }

        $status = $this->mtnPaymentStatus($request->external_id);

        if (($status['status'] ?? null) === 'FAILED') {
            $request->update(['status' => 'failed', 'payload' => $status, 'completed_at' => now()]);
            return;
        }

        if (($status['status'] ?? null) !== 'SUCCESSFUL') {
            return; // still pending (or API unreachable) — leave for the next callback/poll
        }

        $txnId = $status['financialTransactionId'] ?? $request->external_id;

        $this->recordMobilePayment($request->invoice, [
            'channel'             => 'mtn_momo',
            'amount'              => (float) $request->amount,
            'mobile_money_code'   => $txnId,
            'mobile_money_phone'  => data_get($status, 'payer.partyId', $request->phone),
            'mobile_money_payload'=> $status,
            'reference'           => $txnId,
        ]);

        $request->update(['status' => 'completed', 'payload' => $status, 'completed_at' => now()]);
    }

    /**
     * Poll MTN MoMo payment status.
     */
    public function mtnPaymentStatus(string $referenceId): array
    {
        $token = $this->mtnToken();
        $res   = Http::withHeaders([
            'Authorization'              => "Bearer {$token}",
            'X-Target-Environment'       => config('services.mtn_momo.environment', 'sandbox'),
            'Ocp-Apim-Subscription-Key'  => config('services.mtn_momo.subscription_key'),
        ])->get("https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay/{$referenceId}");

        return $res->json();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Shared: record a verified mobile payment
    // ─────────────────────────────────────────────────────────────────────────

    public function recordMobilePayment(Invoice $invoice, array $data): Payment
    {
        return DB::transaction(function () use ($invoice, $data) {
            // Idempotency guard
            $existing = Payment::where('mobile_money_code', $data['mobile_money_code'])->first();
            if ($existing) {
                return $existing;
            }

            try {
            $payment = Payment::create([
                'invoice_id'           => $invoice->id,
                'project_id'           => $invoice->project_id,
                'amount'               => $data['amount'],
                'currency'             => $invoice->currency,
                'method'               => $data['channel'],
                'channel'              => $data['channel'],
                'reference'            => $data['reference'] ?? null,
                'mobile_money_code'    => $data['mobile_money_code'],
                'mobile_money_phone'   => $data['mobile_money_phone'] ?? null,
                'mobile_money_payload' => $data['mobile_money_payload'] ?? null,
                'reconciliation_status'=> 'matched',
                'paid_at'              => now(),
                'notes'                => 'Auto-recorded from mobile money callback',
            ]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException) {
                // A concurrent delivery of the same callback won the race — return its payment.
                return Payment::where('mobile_money_code', $data['mobile_money_code'])->firstOrFail();
            }

            // Mark invoice as paid if fully settled
            if ($invoice->fresh()->amountDue() <= 0) {
                $invoice->update(['status' => 'paid']);
            }

            // Send payment receipt via SMS/WhatsApp
            dispatch(new \Sledeci\Accounting\Jobs\SendPaymentReceiptJob($payment));

            Log::info('Mobile payment recorded', [
                'invoice'  => $invoice->number,
                'channel'  => $data['channel'],
                'code'     => $data['mobile_money_code'],
                'amount'   => $data['amount'],
            ]);

            return $payment;
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function mpesaToken(): string
    {
        $key    = config('services.mpesa.consumer_key');
        $secret = config('services.mpesa.consumer_secret');

        $response = Http::withBasicAuth($key, $secret)
            ->get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials');

        return $response->json('access_token');
    }

    private function airtelToken(): string
    {
        $response = Http::post('https://openapi.airtel.africa/auth/oauth2/token', [
            'client_id'     => config('services.airtel.client_id'),
            'client_secret' => config('services.airtel.client_secret'),
            'grant_type'    => 'client_credentials',
        ]);
        return $response->json('access_token');
    }

    private function mtnToken(): string
    {
        $response = Http::withBasicAuth(
            config('services.mtn_momo.api_user'),
            config('services.mtn_momo.api_key')
        )->post('https://proxy.momoapi.mtn.com/collection/token/');

        return $response->json('access_token');
    }

    private function normalizeMpesaPhone(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone);
        if (str_starts_with($phone, '0')) {
            $phone = '254' . substr($phone, 1);
        }
        if (! str_starts_with($phone, '254')) {
            $phone = '254' . $phone;
        }
        return $phone;
    }
}
