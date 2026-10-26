<?php

use App\Http\Middleware\EnforceModuleAccess;
use App\Http\Middleware\EnsureRegistrationEnabled;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogUserActivity;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',          // served under /api (routes/api.php adds the v1 prefix)
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php', // broadcast channel authorisation
        health: '/up',
    )
    // Listeners are registered explicitly in App\Providers\EventServiceProvider. Auto-discovery
    // (Laravel's default) would register each of them a second time and run them twice.
    ->withEvents(discover: false)
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Telco/Mailgun callbacks are server-to-server POSTs without a CSRF token; they are
        // authenticated by the kenya-payments VerifyWebhookToken middleware / the Mailgun signature instead.
        $middleware->preventRequestForgery(except: ['webhooks/*']);

        // Cookie/session based auth for the first-party SPA calling /api/* (auth:sanctum).
        $middleware->statefulApi();

        $middleware->alias([
            'module.access'      => EnforceModuleAccess::class,
            'role'               => RoleMiddleware::class,
            'permission'         => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            LogUserActivity::class,
            EnsureRegistrationEnabled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
