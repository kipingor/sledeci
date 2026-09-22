<?php

use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Tenant\CRM\ActivityController;
use App\Http\Controllers\Tenant\CRM\CompanyController;
use App\Http\Controllers\Tenant\CRM\ContactController;
use App\Http\Controllers\Tenant\CRM\DealController;
use App\Http\Controllers\Tenant\Project\ProjectController;
use App\Http\Controllers\Tenant\Project\TaskController;
use App\Http\Controllers\Tenant\RoleController;
use App\Http\Controllers\Tenant\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Central Web Routes
|--------------------------------------------------------------------------
| These routes serve the central domain (localhost in dev, nexus.co.ke in
| production). Auth routes here serve both the platform admin and tenant
| users on their custom domain login pages.
|
| Fortify handles POST /login, POST /register, POST /logout.
| These GET routes render the Inertia views for those actions.
|--------------------------------------------------------------------------
*/

// Public — landing page
Route::get('/', fn () => inertia('landing/index'))->name('home');

// Auth views (Fortify handles the POST actions)
Route::middleware('guest')->group(function (): void {
    Route::get('/login', fn () => inertia('Auth/Login', [
        'canResetPassword' => true,
        'status'           => session('status'),
    ]))->name('login');

    Route::get('/register', fn () => inertia('Auth/Register'))->name('register');

    Route::get('/forgot-password', fn () => inertia('Auth/ForgotPassword', [
        'status' => session('status'),
    ]))->name('password.request');

    Route::get('/reset-password/{token}', fn () => inertia('Auth/ResetPassword', [
        'token' => request()->route('token'),
        'email' => request()->email,
    ]))->name('password.reset');
});

// Authenticated routes — InitializeTenancyFromAuth initialises tenant context
// from auth()->user()->tenant_id so BelongsToTenant scopes work on the
// central domain (dev + test).  On real tenant domains the domain middleware
// has already initialised tenancy before this runs (no-op).
Route::middleware(['auth', 'tenant.from.auth'])->group(function (): void {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // ─── User management ──────────────────────────────────────────────────────
    Route::prefix('users')->name('users.')->group(function (): void {
        Route::get('/',            [UserController::class, 'index'])  ->name('index')  ->middleware('permission:user.view');
        Route::get('/invite',      [UserController::class, 'create']) ->name('create') ->middleware('permission:user.invite');
        Route::post('/',           [UserController::class, 'store'])  ->name('store')  ->middleware('permission:user.invite');
        Route::get('/{user}/edit', [UserController::class, 'edit'])   ->name('edit')   ->middleware('permission:user.manage');
        Route::put('/{user}',      [UserController::class, 'update']) ->name('update') ->middleware('permission:user.manage');
        Route::delete('/{user}',   [UserController::class, 'destroy'])->name('destroy')->middleware('permission:user.manage');
    });

    // ─── Role listing ─────────────────────────────────────────────────────────
    Route::get('/roles', [RoleController::class, 'index'])
        ->name('roles.index')
        ->middleware('permission:user.view');

    // ─── Project management ───────────────────────────────────────────────────
    Route::prefix('projects')->name('projects.')->middleware('permission:project.view')->group(function (): void {
        Route::get('/',                         [ProjectController::class, 'index'])  ->name('index');
        Route::get('/create',                   [ProjectController::class, 'create']) ->name('create')->withoutMiddleware('permission:project.view')->middleware('permission:project.create');
        Route::post('/',                        [ProjectController::class, 'store'])  ->name('store')->withoutMiddleware('permission:project.view')->middleware('permission:project.create');
        Route::get('/{project}',                [ProjectController::class, 'show'])   ->name('show');
        Route::get('/{project}/edit',           [ProjectController::class, 'edit'])   ->name('edit')->withoutMiddleware('permission:project.view')->middleware('permission:project.edit');
        Route::put('/{project}',                [ProjectController::class, 'update']) ->name('update')->withoutMiddleware('permission:project.view')->middleware('permission:project.edit');
        Route::delete('/{project}',             [ProjectController::class, 'destroy'])->name('destroy')->withoutMiddleware('permission:project.view')->middleware('permission:project.delete');
        Route::get('/{project}/tasks/create',   [TaskController::class, 'create'])    ->name('tasks.create')->withoutMiddleware('permission:project.view')->middleware('permission:task.create');
        Route::post('/{project}/tasks',         [TaskController::class, 'store'])     ->name('tasks.store')->withoutMiddleware('permission:project.view')->middleware('permission:task.create');
    });

    Route::prefix('tasks')->name('tasks.')->middleware('permission:task.view')->group(function (): void {
        Route::get('/',                  [TaskController::class, 'index'])->name('index');
        Route::get('/{task}/edit',       [TaskController::class, 'edit'])->name('edit')->withoutMiddleware('permission:task.view')->middleware('permission:task.edit');
        Route::put('/{task}',            [TaskController::class, 'update'])->name('update')->withoutMiddleware('permission:task.view')->middleware('permission:task.edit');
        Route::patch('/{task}/done',     [TaskController::class, 'markDone'])->name('done')->withoutMiddleware('permission:task.view')->middleware('permission:task.edit');
        Route::delete('/{task}',         [TaskController::class, 'destroy'])->name('destroy')->withoutMiddleware('permission:task.view')->middleware('permission:task.delete');
    });

    // ─── CRM ─────────────────────────────────────────────────────────────────
    Route::prefix('crm')->group(function (): void {
        // Contacts
        Route::prefix('contacts')->name('contacts.')->middleware('permission:contact.view')->group(function (): void {
            Route::get('/',               [ContactController::class, 'index'])  ->name('index');
            Route::get('/create',         [ContactController::class, 'create']) ->name('create') ->withoutMiddleware('permission:contact.view')->middleware('permission:contact.create');
            Route::post('/',              [ContactController::class, 'store'])  ->name('store')  ->withoutMiddleware('permission:contact.view')->middleware('permission:contact.create');
            Route::get('/{contact}',      [ContactController::class, 'show'])   ->name('show');
            Route::get('/{contact}/edit', [ContactController::class, 'edit'])   ->name('edit')   ->withoutMiddleware('permission:contact.view')->middleware('permission:contact.edit');
            Route::put('/{contact}',      [ContactController::class, 'update']) ->name('update') ->withoutMiddleware('permission:contact.view')->middleware('permission:contact.edit');
            Route::delete('/{contact}',   [ContactController::class, 'destroy'])->name('destroy')->withoutMiddleware('permission:contact.view')->middleware('permission:contact.delete');
        });

        // Companies
        Route::prefix('companies')->name('companies.')->middleware('permission:company.view')->group(function (): void {
            Route::get('/',               [CompanyController::class, 'index'])  ->name('index');
            Route::get('/create',         [CompanyController::class, 'create']) ->name('create') ->withoutMiddleware('permission:company.view')->middleware('permission:company.create');
            Route::post('/',              [CompanyController::class, 'store'])  ->name('store')  ->withoutMiddleware('permission:company.view')->middleware('permission:company.create');
            Route::get('/{company}',      [CompanyController::class, 'show'])   ->name('show');
            Route::get('/{company}/edit', [CompanyController::class, 'edit'])   ->name('edit')   ->withoutMiddleware('permission:company.view')->middleware('permission:company.edit');
            Route::put('/{company}',      [CompanyController::class, 'update']) ->name('update') ->withoutMiddleware('permission:company.view')->middleware('permission:company.edit');
            Route::delete('/{company}',   [CompanyController::class, 'destroy'])->name('destroy')->withoutMiddleware('permission:company.view')->middleware('permission:company.delete');
        });

        // Deals
        Route::prefix('deals')->name('deals.')->middleware('permission:deal.view')->group(function (): void {
            Route::get('/',             [DealController::class, 'index'])  ->name('index');
            Route::get('/create',       [DealController::class, 'create']) ->name('create') ->withoutMiddleware('permission:deal.view')->middleware('permission:deal.create');
            Route::post('/',            [DealController::class, 'store'])  ->name('store')  ->withoutMiddleware('permission:deal.view')->middleware('permission:deal.create');
            Route::get('/{deal}',       [DealController::class, 'show'])   ->name('show');
            Route::get('/{deal}/edit',  [DealController::class, 'edit'])   ->name('edit')   ->withoutMiddleware('permission:deal.view')->middleware('permission:deal.edit');
            Route::put('/{deal}',       [DealController::class, 'update']) ->name('update') ->withoutMiddleware('permission:deal.view')->middleware('permission:deal.edit');
            Route::delete('/{deal}',    [DealController::class, 'destroy'])->name('destroy')->withoutMiddleware('permission:deal.view')->middleware('permission:deal.delete');
        });

        // Activities (attached to contacts or deals via ?for=contact,{id})
        Route::prefix('activities')->name('activities.')->middleware('permission:activity.view')->group(function (): void {
            Route::post('/',                    [ActivityController::class, 'store'])    ->name('store')    ->withoutMiddleware('permission:activity.view')->middleware('permission:activity.create');
            Route::put('/{activity}',           [ActivityController::class, 'update'])   ->name('update')   ->withoutMiddleware('permission:activity.view')->middleware('permission:activity.edit');
            Route::patch('/{activity}/done',    [ActivityController::class, 'markDone'])->name('markDone') ->withoutMiddleware('permission:activity.view')->middleware('permission:activity.edit');
            Route::delete('/{activity}',        [ActivityController::class, 'destroy'])  ->name('destroy')  ->withoutMiddleware('permission:activity.view')->middleware('permission:activity.delete');
        });
    });
});

// Central platform-admin routes (routes/central.php)
require __DIR__.'/central.php';
require __DIR__.'/settings.php';
