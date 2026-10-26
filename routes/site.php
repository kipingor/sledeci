<?php

use App\Http\Controllers\Site\CareersController;
use App\Http\Controllers\Site\SiteController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public website (no login)
|--------------------------------------------------------------------------
| Included from routes/web.php. Route names deliberately have no "web."
| prefix, so EnforceModuleAccess never applies to them.
*/

Route::get('/', [SiteController::class, 'home'])->name('home');
Route::get('/welcome', fn () => redirect()->route('home'));

Route::get('/about', [SiteController::class, 'about'])->name('about');
Route::get('/solutions', [SiteController::class, 'solutions'])->name('solutions');
Route::get('/terms', [SiteController::class, 'terms'])->name('terms');
Route::get('/contact', [SiteController::class, 'contact'])->name('contact');
Route::post('/contact', [SiteController::class, 'storeContact'])->middleware('throttle:5,1')->name('contact.store');

Route::prefix('careers')->name('careers.')->group(function () {
    Route::get('/', [CareersController::class, 'index'])->name('index');
    Route::get('/{jobPosting}', [CareersController::class, 'show'])->name('show');
    Route::post('/{jobPosting}/apply', [CareersController::class, 'apply'])->middleware('throttle:5,1')->name('apply');
});
