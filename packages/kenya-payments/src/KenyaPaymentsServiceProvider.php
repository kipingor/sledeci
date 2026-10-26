<?php

namespace Sledeci\KenyaPayments;

use Illuminate\Support\Facades\Route;
use Sledeci\Core\Contracts\PaymentGateway;
use Sledeci\Core\Modules\Module;
use Sledeci\Core\Support\ModuleServiceProvider;
use Sledeci\KenyaPayments\Http\Middleware\VerifyWebhookToken;
use Sledeci\KenyaPayments\Models\MobileMoneyRequest;
use Sledeci\KenyaPayments\Policies\MobileMoneyRequestPolicy;
use Sledeci\KenyaPayments\Services\MobileMoneyService;

/**
 * M-Pesa, Airtel Money and MTN MoMo. Implements the core PaymentGateway contract so
 * accounting can start a payment without importing this package.
 *
 * Provider credentials stay in the host's config/services.php (mpesa, airtel, mtn_momo).
 */
class KenyaPaymentsServiceProvider extends ModuleServiceProvider
{
    public function register(): void
    {
        parent::register();

        $this->app->bind(PaymentGateway::class, MobileMoneyService::class);
    }

    protected function module(): Module
    {
        return new Module(
            key: 'kenya-payments',
            label: 'Mobile money',
            routeModules: [],
            roles: ['accountant', 'finance'],
        );
    }

    protected function policies(): array
    {
        return [MobileMoneyRequest::class => MobileMoneyRequestPolicy::class];
    }

    public function boot(): void
    {
        parent::boot();

        $this->app['router']->aliasMiddleware('webhook.token', VerifyWebhookToken::class);

        $this->registerWebhooks();
    }

    /**
     * Public callbacks: no login, no module access. They are authenticated by the shared
     * webhook token, and CSRF is bypassed for "webhooks/*" in the host's bootstrap/app.php.
     */
    private function registerWebhooks(): void
    {
        $routes = $this->packagePath('routes/webhooks.php');

        if ($this->app->routesAreCached() || ! is_file($routes)) {
            return;
        }

        Route::middleware(['web', 'webhook.token'])
            ->prefix('webhooks')
            ->name('webhooks.')
            ->group($routes);
    }
}
