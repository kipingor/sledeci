<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\CompanySettingsController;
use App\Http\Controllers\Web\ApprovalController;
use App\Http\Controllers\Web\EtimsController;
use App\Http\Controllers\Web\RfpController;
use App\Http\Controllers\Web\TenderController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    // Main settings dashboard
    Route::get('settings/dashboard', [SettingsController::class, 'index'])
        ->name('settings.index');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->middleware('verified')->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    // Security page (password, two-factor, passkeys) - used by the settings layout nav.
    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(array_merge(
            ['verified'],
            Features::canManageTwoFactorAuthentication()
                && Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword')
                    ? ['password.confirm']
                    : []
        ))
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware(['verified', 'throttle:6,1'])
        ->name('user-password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->middleware('verified')->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');

    // Company-wide settings (admin only — add 'role:admin' middleware as needed)
    Route::get('settings/company', [CompanySettingsController::class, 'edit'])
        ->name('settings.company')
        ->middleware('role:admin');
    Route::patch('settings/company', [CompanySettingsController::class, 'update'])
        ->name('settings.company.update')
        ->middleware('role:admin');
    Route::post('settings/company/logo', [CompanySettingsController::class, 'uploadLogo'])
        ->name('settings.company.logo')
        ->middleware('role:admin');
    Route::get('settings/company/test-etims', [CompanySettingsController::class, 'testEtims'])
        ->name('settings.company.test-etims')
        ->middleware('role:admin');
});
