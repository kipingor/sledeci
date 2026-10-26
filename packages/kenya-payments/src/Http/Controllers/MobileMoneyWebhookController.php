<?php

namespace Sledeci\KenyaPayments\Http\Controllers;

use Sledeci\Core\Http\Controller;
use Sledeci\KenyaPayments\Services\MobileMoneyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * MobileMoneyWebhookController
 *
 * Handles inbound callbacks from:
 *  - Safaricom M-Pesa Daraja (STK push result + C2B confirmation/validation)
 *  - Airtel Money payment notifications
 *  - MTN MoMo (polled, not pushed — but webhook support included)
 *
 * These routes are CSRF-exempt (see bootstrap/app.php) and authenticated with the
 * 'webhook.token' middleware (WEBHOOK_SECRET). Payments are only recorded when the
 * callback matches a request we initiated (mobile_money_requests table).
 */
class MobileMoneyWebhookController extends Controller
{
    public function __construct(private MobileMoneyService $service) {}

    // ── M-Pesa STK Push result ─────────────────────────────────────────────

    public function mpesaPosCallback(Request $request)
    {
        Log::info('M-Pesa POS callback received', $request->all());

        try {
            $this->service->handleMpesaCallback($request->all());
        } catch (\Throwable $e) {
            Log::error('M-Pesa POS callback processing failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function mpesaStkCallback(Request $request)
    {
        Log::info('M-Pesa STK callback received', $request->all());

        try {
            $this->service->handleMpesaCallback($request->all());
        } catch (\Throwable $e) {
            Log::error('M-Pesa STK callback processing failed', ['error' => $e->getMessage()]);
        }

        // Safaricom requires HTTP 200 with this exact body
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    // ── M-Pesa C2B Validation (whitelist — always accept) ─────────────────

    public function mpesaC2BValidation(Request $request)
    {
        Log::info('M-Pesa C2B validation', $request->all());
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    // ── M-Pesa C2B Confirmation ────────────────────────────────────────────

    public function mpesaC2BConfirmation(Request $request)
    {
        Log::info('M-Pesa C2B confirmation received', $request->all());

        try {
            $this->service->handleMpesaC2BConfirmation($request->all());
        } catch (\Throwable $e) {
            Log::error('M-Pesa C2B confirmation failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    // ── Airtel Money ───────────────────────────────────────────────────────

    public function airtelCallback(Request $request)
    {
        Log::info('Airtel Money callback received', $request->all());

        try {
            $this->service->handleAirtelCallback($request->all());
        } catch (\Throwable $e) {
            Log::error('Airtel Money callback failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'received']);
    }

    // ── MTN MoMo (webhook-based if configured) ─────────────────────────────

    public function mtnCallback(Request $request)
    {
        Log::info('MTN MoMo callback received', $request->all());

        try {
            $this->service->handleMtnCallback($request->all());
        } catch (\Throwable $e) {
            Log::error('MTN MoMo callback failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'ok']);
    }
}
