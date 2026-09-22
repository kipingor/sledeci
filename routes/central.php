<?php

use App\Http\Controllers\Central\TenantController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Central Platform-Admin Routes
|--------------------------------------------------------------------------
| These routes are for Nexus platform operators only — never for tenants.
| They live on the central domain and behind the 'platform_admin' gate.
|--------------------------------------------------------------------------
*/

Route::prefix('admin')
    ->name('central.')
    ->middleware(['web', 'auth'])
    ->group(function (): void {

        Route::get('/tenants', [TenantController::class, 'index'])->name('tenants.index');
        Route::get('/tenants/{tenant}', [TenantController::class, 'show'])->name('tenants.show');
        Route::post('/tenants', [TenantController::class, 'store'])->name('tenants.store');
        Route::post('/tenants/{tenant}/suspend', [TenantController::class, 'suspend'])->name('tenants.suspend');
        Route::post('/tenants/{tenant}/activate', [TenantController::class, 'activate'])->name('tenants.activate');
        Route::delete('/tenants/{tenant}', [TenantController::class, 'destroy'])->name('tenants.destroy');
    });
