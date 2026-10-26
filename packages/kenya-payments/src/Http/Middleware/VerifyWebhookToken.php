<?php

namespace Sledeci\KenyaPayments\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates third-party payment callbacks (M-Pesa, Airtel, MTN) that cannot
 * sign their requests. The shared secret (WEBHOOK_SECRET) is appended to the
 * callback URL as ?token=... (or sent in an X-Webhook-Token header).
 *
 * Fails closed: if no secret is configured the endpoint is disabled, except in
 * local/testing environments.
 */
class VerifyWebhookToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('services.webhooks.secret');

        if ($secret === '') {
            if (app()->environment(['local', 'testing'])) {
                return $next($request);
            }

            abort(503, 'Webhook endpoint not configured.');
        }

        $given = (string) ($request->query('token') ?? $request->header('X-Webhook-Token', ''));

        if (! hash_equals($secret, $given)) {
            abort(403, 'Invalid webhook token.');
        }

        return $next($request);
    }
}
