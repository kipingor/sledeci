<?php

use Illuminate\Support\Facades\Route;
use Sledeci\KenyaPayments\Http\Controllers\MobileMoneyWebhookController;

/*
|--------------------------------------------------------------------------
| Payment-provider callbacks
|--------------------------------------------------------------------------
| Public endpoints called by Safaricom, Airtel and MTN. Registered by
| KenyaPaymentsServiceProvider with the "web" and "webhook.token" middleware and
| the "webhooks." name prefix. CSRF is bypassed for "webhooks/*" in the host's
| bootstrap/app.php (preventRequestForgery), and the shared token is checked by
| VerifyWebhookToken.
*/

// M-Pesa Daraja
Route::post('mpesa/pos-callback', [MobileMoneyWebhookController::class, 'mpesaPosCallback'])->name('mpesa.pos-callback');
Route::post('mpesa/stk-callback', [MobileMoneyWebhookController::class, 'mpesaStkCallback'])->name('mpesa.callback');
Route::post('mpesa/c2b-validation', [MobileMoneyWebhookController::class, 'mpesaC2BValidation'])->name('mpesa.c2b-validation');
Route::post('mpesa/c2b-confirmation', [MobileMoneyWebhookController::class, 'mpesaC2BConfirmation'])->name('mpesa.c2b-confirmation');

// Airtel Money
Route::post('airtel/callback', [MobileMoneyWebhookController::class, 'airtelCallback'])->name('airtel.callback');

// MTN MoMo
Route::post('mtn/callback', [MobileMoneyWebhookController::class, 'mtnCallback'])->name('mtn.callback');
