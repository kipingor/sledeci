<?php

namespace Tests\Feature\Packages;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Sledeci\Core\Contracts\PaymentGateway;
use Sledeci\Core\Modules\ModuleRegistry;
use Sledeci\KenyaPayments\Http\Middleware\VerifyWebhookToken;
use Sledeci\KenyaPayments\KenyaPaymentsServiceProvider;
use Sledeci\KenyaPayments\Models\MobileMoneyRequest;
use Sledeci\KenyaPayments\Policies\MobileMoneyRequestPolicy;
use Sledeci\KenyaPayments\Services\MobileMoneyService;
use Sledeci\KenyaTax\KenyaTaxServiceProvider;
use Tests\TestCase;

/**
 * Extraction of eTIMS into packages/kenya-tax and mobile money into packages/kenya-payments.
 * (Webhook behaviour itself is covered by Tests\Feature\MobileMoneyWebhookTest.)
 */
class KenyaPackagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_both_packages_register_as_modules(): void
    {
        $loaded = $this->app->getLoadedProviders();
        $this->assertArrayHasKey(KenyaTaxServiceProvider::class, $loaded);
        $this->assertArrayHasKey(KenyaPaymentsServiceProvider::class, $loaded);

        $registry = $this->app->make(ModuleRegistry::class);
        $this->assertTrue($registry->has('kenya-tax'));
        $this->assertTrue($registry->has('kenya-payments'));
    }

    public function test_etims_routes_keep_their_names_and_run_behind_auth_and_module_access(): void
    {
        foreach (['web.invoices.etims.submit', 'web.invoices.etims.bulk-submit', 'web.invoices.etims.status', 'web.etims.standard-codes', 'web.etims.test-connection'] as $name) {
            $route = Route::getRoutes()->getByName($name);

            $this->assertNotNull($route, "Route {$name} is missing");
            $this->assertContains('auth', $route->gatherMiddleware(), $name);
            $this->assertContains('module.access', $route->gatherMiddleware(), $name);
        }
    }

    public function test_webhooks_are_public_but_protected_by_the_webhook_token(): void
    {
        foreach (['mpesa.callback', 'mpesa.pos-callback', 'mpesa.c2b-validation', 'mpesa.c2b-confirmation', 'airtel.callback', 'mtn.callback'] as $suffix) {
            $route = Route::getRoutes()->getByName("webhooks.{$suffix}");

            $this->assertNotNull($route, "Route webhooks.{$suffix} is missing");

            $middleware = $route->gatherMiddleware();
            $this->assertContains('web', $middleware, $suffix);
            $this->assertContains('webhook.token', $middleware, $suffix);
            $this->assertNotContains('auth', $middleware, "{$suffix} must not require a login: providers call it");
        }
    }

    public function test_the_webhook_token_alias_points_at_the_package_middleware(): void
    {
        $this->assertSame(VerifyWebhookToken::class, $this->app['router']->getMiddleware()['webhook.token']);
    }

    public function test_the_payment_gateway_contract_is_served_by_the_package(): void
    {
        $gateway = $this->app->make(PaymentGateway::class);

        $this->assertInstanceOf(MobileMoneyService::class, $gateway);
        $this->assertSame('mpesa', $gateway->name());
    }

    public function test_the_mobile_money_policy_is_registered_and_not_a_stub(): void
    {
        $this->assertInstanceOf(MobileMoneyRequestPolicy::class, Gate::getPolicyFor(MobileMoneyRequest::class));
    }

    public function test_accounting_can_start_a_push_without_importing_the_mobile_money_package(): void
    {
        $constructor = (new \ReflectionClass(\Sledeci\Accounting\Http\Controllers\InvoiceController::class))->getConstructor();

        $types = array_map(fn ($p) => (string) $p->getType(), $constructor->getParameters());

        $this->assertContains('?'.PaymentGateway::class, $types);
        $this->assertNotContains(MobileMoneyService::class, $types);
    }
}
