<?php

use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\DeliveryController;
use App\Http\Controllers\Web\MailgunWebhookController;
use App\Http\Controllers\Web\MobileMoneyWebhookController;
use Illuminate\Support\Facades\Route;

// ── Mailgun inbound webhook ────────────────────────────────────────────────────
Route::post('/webhooks/mailgun/inbound', [MailgunWebhookController::class, 'inbound'])
    ->name('webhooks.mailgun.inbound')
    ->withoutMiddleware(['web', 'auth', 'verified']);

Route::prefix('webhooks')->name('webhooks.')->middleware('webhook.token')->group(function () {

    // M-Pesa Daraja
    Route::post('mpesa/pos-callback', [MobileMoneyWebhookController::class, 'mpesaPosCallback'])->name('mpesa.pos-callback');
    Route::post('mpesa/stk-callback', [MobileMoneyWebhookController::class, 'mpesaStkCallback'])->name('mpesa.callback');
    Route::post('mpesa/c2b-validation', [MobileMoneyWebhookController::class, 'mpesaC2BValidation'])->name('mpesa.c2b-validation');
    Route::post('mpesa/c2b-confirmation', [MobileMoneyWebhookController::class, 'mpesaC2BConfirmation'])->name('mpesa.c2b-confirmation');

    // Airtel Money
    Route::post('airtel/callback', [MobileMoneyWebhookController::class, 'airtelCallback'])->name('airtel.callback');

    // MTN MoMo
    Route::post('mtn/callback', [MobileMoneyWebhookController::class, 'mtnCallback'])->name('mtn.callback');
});

// ── Public website: home, about, solutions, terms, contact, careers ─────────
require __DIR__.'/site.php';

Route::middleware(['auth', 'verified', 'module.access'])
    ->name('web.')
    ->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        // Load authenticated domain routes from routes/domain/*.php.
        foreach (glob(__DIR__.'/domain/*.php') as $routeFile) {
            require $routeFile;
        }
    });

// ── Public delivery confirmation (no auth) ────────────────────────────────────
// Customers confirm a delivery from an emailed link, so these sit outside the
// auth group. Names keep the "web." prefix used by emails and the frontend.
Route::get('/delivery-confirm/{token}', [DeliveryController::class, 'confirmPage'])->name('web.deliveries.confirm-page');
Route::post('/delivery-confirm/{token}', [DeliveryController::class, 'confirmByToken'])->name('web.deliveries.confirm-by-token');

require __DIR__.'/settings.php';
