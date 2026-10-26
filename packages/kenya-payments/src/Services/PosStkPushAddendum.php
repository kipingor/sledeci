<?php

namespace Sledeci\KenyaPayments\Services;

trait PosStkPushAddendum
{
    /**
     * Initiate M-Pesa STK push for a POS sale (no Invoice required).
     *
     * @param  string  $phone   Format: 254XXXXXXXXX or 07XXXXXXXX
     * @param  float   $amount
     * @return array{checkout_request_id: string, merchant_request_id: string}
     */
    public function posStkPush(string $phone, float $amount): array
    {
        $token     = $this->mpesaToken();
        $shortcode = config('services.mpesa.shortcode');
        $passkey   = config('services.mpesa.passkey');
        $timestamp = now()->format('YmdHis');
        $password  = base64_encode($shortcode . $passkey . $timestamp);
        $amount    = (int) ceil($amount);
        $phone     = $this->normalizeMpesaPhone($phone);
        $reference = 'POS-' . now()->format('YmdHis');

        $response = \Illuminate\Support\Facades\Http::withToken($token)
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
                'CallBackURL'       => route('webhooks.mpesa.pos-callback'),
                'AccountReference'  => $reference,
                'TransactionDesc'   => 'POS Sale',
            ]);

        $data = $response->json();

        if (($data['ResponseCode'] ?? '') !== '0') {
            throw new \RuntimeException(
                'M-Pesa STK push failed: ' . ($data['errorMessage'] ?? $data['ResponseDescription'] ?? 'Unknown error')
            );
        }

        return [
            'checkout_request_id' => $data['CheckoutRequestID'],
            'merchant_request_id' => $data['MerchantRequestID'],
            'reference'           => $reference,
        ];
    }
}