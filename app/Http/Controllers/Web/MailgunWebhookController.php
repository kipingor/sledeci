<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Email;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MailgunWebhookController extends Controller
{
    /**
     * Handle Mailgun inbound email webhook.
     *
     * Mailgun POSTs multipart/form-data with these fields:
     *   sender, recipient, subject, body-plain, body-html,
     *   stripped-text, stripped-html, timestamp, token, signature,
     *   message-headers (JSON), attachments (count), attachment-1 ...
     *
     * Route: POST /webhooks/mailgun/inbound  (no auth middleware)
     */
    public function inbound(Request $request): Response
    {
        // ── 1. Verify Mailgun signature ───────────────────────────────────
        if (! $this->verifySignature($request)) {
            Log::warning('Mailgun webhook: invalid signature');
            return response('Unauthorized', 403);
        }

        try {
            // ── 2. Extract fields ─────────────────────────────────────────
            $from       = $request->input('sender', '');
            $to         = $request->input('recipient', '');
            $subject    = $request->input('subject', '(no subject)');
            $bodyPlain  = $request->input('stripped-text') ?: $request->input('body-plain', '');
            $bodyHtml   = $request->input('stripped-html') ?: $request->input('body-html', '');
            $receivedAt = now();

            // ── 3. Parse sender name + email ──────────────────────────────
            [$fromName, $fromEmail] = $this->parseSender($from);

            // ── 4. Persist as Email record ────────────────────────────────
            $email = Email::create([
                'from'        => $fromEmail,
                'from_name'   => $fromName,
                'to'          => $to,
                'subject'     => $subject,
                'body'        => $bodyHtml ?: nl2br(e($bodyPlain)),
                'body_plain'  => $bodyPlain,
                'direction'   => 'inbound',
                'status'      => 'received',
                'received_at' => $receivedAt,
                'metadata'    => [
                    'mailgun_timestamp' => $request->input('timestamp'),
                    'message_id'        => $this->extractMessageId($request->input('message-headers', '[]')),
                ],
            ]);

            Log::info('Mailgun inbound email stored', ['email_id' => $email->id, 'from' => $fromEmail]);

            return response('OK', 200);

        } catch (\Throwable $e) {
            Log::error('Mailgun webhook processing failed', ['error' => $e->getMessage()]);
            // Return 200 so Mailgun does not retry — log the failure instead
            return response('Error logged', 200);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private function verifySignature(Request $request): bool
    {
        $signingKey = config('services.mailgun.webhook_signing_key');

        // Fail closed: only skip verification in local/testing environments.
        if (empty($signingKey)) {
            return app()->environment(['local', 'testing']);
        }

        $timestamp = $request->input('timestamp', '');
        $token     = $request->input('token', '');
        $signature = $request->input('signature', '');

        // Reject if timestamp is more than 15 minutes old (replay attack)
        if (abs(time() - (int) $timestamp) > 900) {
            return false;
        }

        $expectedSig = hash_hmac('sha256', $timestamp . $token, $signingKey);

        return hash_equals($expectedSig, $signature);
    }

    private function parseSender(string $from): array
    {
        // Formats: "Name <email@domain.com>" or "email@domain.com"
        if (preg_match('/^(.+?)\s*<(.+?)>$/', $from, $m)) {
            return [trim($m[1], ' "\''), trim($m[2])];
        }
        return ['', trim($from)];
    }

    private function extractMessageId(string $headersJson): string
    {
        try {
            $headers = json_decode($headersJson, true) ?? [];
            foreach ($headers as $pair) {
                if (isset($pair[0]) && strtolower($pair[0]) === 'message-id') {
                    return trim($pair[1], '<>');
                }
            }
        } catch (\Throwable) {
        }
        return '';
    }
}
