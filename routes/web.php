<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\MailgunWebhookController;

// ── Mailgun inbound webhook ────────────────────────────────────────────────────
Route::post('/webhooks/mailgun/inbound', [MailgunWebhookController::class, 'inbound'])
    ->name('webhooks.mailgun.inbound')
    ->withoutMiddleware(['web', 'auth', 'verified']);

Route::prefix('webhooks')->name('webhooks.')->middleware('webhook.token')->group(function () {

    // M-Pesa Daraja
    Route::post('mpesa/pos-callback',     [\App\Http\Controllers\Web\MobileMoneyWebhookController::class, 'mpesaPosCallback'])->name('mpesa.pos-callback');
    Route::post('mpesa/stk-callback',     [\App\Http\Controllers\Web\MobileMoneyWebhookController::class, 'mpesaStkCallback'])->name('mpesa.callback');
    Route::post('mpesa/c2b-validation',   [\App\Http\Controllers\Web\MobileMoneyWebhookController::class, 'mpesaC2BValidation'])->name('mpesa.c2b-validation');
    Route::post('mpesa/c2b-confirmation', [\App\Http\Controllers\Web\MobileMoneyWebhookController::class, 'mpesaC2BConfirmation'])->name('mpesa.c2b-confirmation');

    // Airtel Money
    Route::post('airtel/callback',        [\App\Http\Controllers\Web\MobileMoneyWebhookController::class, 'airtelCallback'])->name('airtel.callback');

    // MTN MoMo
    Route::post('mtn/callback',           [\App\Http\Controllers\Web\MobileMoneyWebhookController::class, 'mtnCallback'])->name('mtn.callback');
});

// ── Public root ──────────────────────────────────────────────────────────
Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('web.dashboard');
    }
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('/welcome', function () {
    return redirect()->route('home');
});

// Load domain (modular) routes from routes/domain/*.php
foreach (glob(__DIR__ . '/domain/*.php') as $routeFile) {
    require $routeFile;
}

// ── Public delivery confirmation (no auth) ────────────────────────────────────
// Note: These are also registered inside the auth group above as a fallback.
// Keeping them here ensures they work even if middleware is misconfigured.

require __DIR__ . '/settings.php';
