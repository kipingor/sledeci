<?php

use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\DeliveryController;
use App\Http\Controllers\Web\MailgunWebhookController;
use Illuminate\Support\Facades\Route;

// Payment-provider callbacks (M-Pesa, Airtel Money, MTN) are registered by the
// kenya-payments package; see packages/kenya-payments/routes/webhooks.php.

// ── Mailgun inbound webhook ────────────────────────────────────────────────────
Route::post('/webhooks/mailgun/inbound', [MailgunWebhookController::class, 'inbound'])
    ->name('webhooks.mailgun.inbound')
    ->withoutMiddleware(['web', 'auth', 'verified']);


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
