<?php

namespace App\Services;

use App\Models\MessageLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;

/**
 * MessagingService
 *
 * Delivers invoice reminders, payment receipts, and custom messages via:
 *  1. WhatsApp Business API (Meta / preferred for smartphones)
 *  2. Africa's Talking SMS API  (fallback / feature phones / USSD regions)
 *
 * Both channels are gated by env vars — only configured channels are used.
 * All sent messages are logged to the message_logs table for auditing.
 */
class MessagingService
{
    // ─────────────────────────────────────────────────────────────────────────
    // High-level send methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Send invoice to client via WhatsApp (preferred) or SMS (fallback).
     *
     * @param  string  $phone  E.164 format: +254712345678
     */
    public function sendInvoice(Invoice $invoice, string $phone): MessageLog
    {
        $body = $this->renderTemplate('invoice_notification', [
            'invoice_number' => $invoice->number,
            'amount' => $this->formatMoney((float) $invoice->total, $invoice->currency),
            'due_date' => $invoice->due_date?->format('d M Y'),
            'client_name' => $invoice->client?->name,
            'company_name' => config('company.name'),
            'pay_link' => route('web.invoices.show', $invoice),
        ]);

        return $this->send($phone, $body, 'invoice_notification', $invoice);
    }

    /**
     * Send payment receipt after successful payment.
     */
    public function sendPaymentReceipt(Payment $payment): MessageLog
    {
        $invoice = $payment->invoice;
        $phone = $invoice?->client?->phone
                ?? $payment->mobile_money_phone
                ?? null;

        if (! $phone) {
            Log::warning('Cannot send payment receipt: no phone on record', ['payment' => $payment->id]);

            return new MessageLog(['status' => 'failed', 'provider_error' => 'No phone number']);
        }

        $body = $this->renderTemplate('payment_receipt', [
            'client_name' => $invoice?->client?->name,
            'amount' => $this->formatMoney((float) $payment->amount, $payment->currency),
            'method' => strtoupper($payment->channel ?? $payment->method),
            'reference' => $payment->mobile_money_code ?? $payment->reference ?? 'N/A',
            'invoice_number' => $invoice?->number,
            'balance_due' => $invoice ? $this->formatMoney($invoice->fresh()->amountDue(), $invoice->currency) : '0',
            'company_name' => config('company.name'),
        ]);

        return $this->send($phone, $body, 'payment_receipt', $payment);
    }

    /**
     * Send payment reminder for an overdue invoice.
     */
    public function sendPaymentReminder(Invoice $invoice): MessageLog
    {
        $phone = $invoice->client?->phone ?? null;
        if (! $phone) {
            return new MessageLog(['status' => 'failed', 'provider_error' => 'No phone number']);
        }

        $daysOverdue = now()->diffInDays($invoice->due_date);
        $body = $this->renderTemplate('payment_reminder', [
            'client_name' => $invoice->client?->name,
            'invoice_number' => $invoice->number,
            'amount_due' => $this->formatMoney($invoice->amountDue(), $invoice->currency),
            'days_overdue' => $daysOverdue,
            'due_date' => $invoice->due_date?->format('d M Y'),
            'company_name' => config('company.name'),
            'pay_link' => route('web.invoices.show', $invoice),
        ]);

        return $this->send($phone, $body, 'payment_reminder', $invoice);
    }

    /**
     * Send a free-form message to any phone number.
     */
    public function sendCustom(string $phone, string $body, string $template = 'custom', ?object $subject = null): MessageLog
    {
        return $this->send($phone, $body, $template, $subject);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core send dispatcher
    // ─────────────────────────────────────────────────────────────────────────

    private function send(string $phone, string $body, string $template, ?object $subject): MessageLog
    {
        $log = new MessageLog([
            'to_phone' => $phone,
            'template' => $template,
            'body' => $body,
            'status' => 'queued',
        ]);

        if ($subject) {
            $log->messageable_type = get_class($subject);
            $log->messageable_id = $subject->id ?? null;
        }

        // Try WhatsApp first (if configured)
        if (config('services.whatsapp.token')) {
            try {
                $result = $this->sendWhatsApp($phone, $body);
                $log->channel = 'whatsapp';
                $log->status = 'sent';
                $log->provider_message_id = $result['messages'][0]['id'] ?? null;
                $log->cost = 0.005; // ~$0.005 per conversation
                $log->sent_at = now();
                $log->save();

                return $log;
            } catch (\Throwable $e) {
                Log::warning('WhatsApp send failed, falling back to SMS', ['error' => $e->getMessage()]);
            }
        }

        // Fallback: Africa's Talking SMS
        if (config('services.africas_talking.api_key')) {
            try {
                $result = $this->sendAfricasTalkingSms($phone, $body);
                $log->channel = 'sms';
                $log->status = 'sent';
                $log->provider_message_id = data_get($result, 'SMSMessageData.Recipients.0.messageId');
                $log->cost = (float) (data_get($result, 'SMSMessageData.Recipients.0.cost', 0));
                $log->sent_at = now();
                $log->save();

                return $log;
            } catch (\Throwable $e) {
                Log::error('SMS send also failed', ['error' => $e->getMessage()]);
                $log->status = 'failed';
                $log->provider_error = $e->getMessage();
                $log->save();

                return $log;
            }
        }

        Log::warning('No messaging provider configured — message not sent', ['phone' => $phone]);
        $log->status = 'failed';
        $log->provider_error = 'No messaging provider configured';
        $log->save();

        return $log;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Provider implementations
    // ─────────────────────────────────────────────────────────────────────────

    private function sendWhatsApp(string $phone, string $body): array
    {
        // Normalise phone to E.164 without the '+'
        $phone = ltrim(preg_replace('/\D/', '', $phone), '0');
        if (! str_starts_with($phone, '254') && strlen($phone) === 9) {
            $phone = '254'.$phone;
        }

        $response = Http::withToken(config('services.whatsapp.token'))
            ->timeout(15)
            ->post('https://graph.facebook.com/v19.0/'.config('services.whatsapp.phone_number_id').'/messages', [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'text',
                'text' => ['body' => $body],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('WhatsApp API error: '.$response->body());
        }

        return $response->json();
    }

    private function sendAfricasTalkingSms(string $phone, string $body): array
    {
        // Africa's Talking wants E.164 with '+' prefix
        if (! str_starts_with($phone, '+')) {
            $phone = '+'.ltrim($phone, '+');
        }

        $response = Http::withHeaders([
            'apiKey' => config('services.africas_talking.api_key'),
            'Accept' => 'application/json',
        ])->asForm()
            ->timeout(15)
            ->post('https://api.africastalking.com/version1/messaging', [
                'username' => config('services.africas_talking.username'),
                'to' => $phone,
                'message' => $body,
                'from' => config('services.africas_talking.sender_id'),
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Africa\'s Talking SMS error: '.$response->body());
        }

        return $response->json();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Templates
    // ─────────────────────────────────────────────────────────────────────────

    private function renderTemplate(string $template, array $vars): string
    {
        return match ($template) {
            'invoice_notification' => "Hi {$vars['client_name']}, {$vars['company_name']} has sent you Invoice #{$vars['invoice_number']} for {$vars['amount']}, due {$vars['due_date']}.\n\nView & pay: {$vars['pay_link']}",

            'payment_receipt' => "✅ Payment received! Hi {$vars['client_name']}, we've received your {$vars['amount']} via {$vars['method']} (Ref: {$vars['reference']}) for Invoice #{$vars['invoice_number']}.\n".
                ($vars['balance_due'] > 0 ? "Balance remaining: {$vars['balance_due']}." : 'Invoice fully paid. Thank you!').
                "\n— {$vars['company_name']}",

            'payment_reminder' => "⚠️ REMINDER: Hi {$vars['client_name']}, Invoice #{$vars['invoice_number']} for {$vars['amount_due']} was due on {$vars['due_date']} ({$vars['days_overdue']} days overdue).\n\nPay now: {$vars['pay_link']}\n— {$vars['company_name']}",

            default => $vars['body'] ?? '',
        };
    }

    private function formatMoney(float $amount, string $currency): string
    {
        return number_format($amount, 2).' '.strtoupper($currency);
    }
}
