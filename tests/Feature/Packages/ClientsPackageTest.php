<?php

namespace Tests\Feature\Packages;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Sledeci\Clients\ClientsServiceProvider;
use Sledeci\Clients\Models\ClientFollowUp;
use Sledeci\Clients\Models\ClientReport;
use Sledeci\Core\Contracts\ClientFinancialSummary;
use Sledeci\Core\Fallbacks\NullClientFinancialSummary;
use Sledeci\Core\Modules\ModuleRegistry;
use Tests\TestCase;

/**
 * Pilot extraction: the Clients module now lives in packages/clients.
 */
class ClientsPackageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_package_registers_itself_as_a_module(): void
    {
        $this->assertContains(ClientsServiceProvider::class, array_keys($this->app->getLoadedProviders()));

        $module = $this->app->make(ModuleRegistry::class)->get('clients');

        $this->assertNotNull($module);
        $this->assertSame(['clients', 'follow-ups', 'client-reports'], $module->routeModules);
    }

    public function test_the_package_routes_keep_their_names_and_run_behind_auth_and_module_access(): void
    {
        foreach (['web.clients.index', 'web.clients.show', 'web.follow-ups.store', 'web.client-reports.show'] as $name) {
            $route = Route::getRoutes()->getByName($name);

            $this->assertNotNull($route, "Route {$name} is missing");
            $this->assertContains('auth', $route->gatherMiddleware());
            $this->assertContains('module.access', $route->gatherMiddleware());
        }
    }

    public function test_package_policies_are_registered(): void
    {
        $this->assertNotNull(Gate::getPolicyFor(ClientFollowUp::class));
        $this->assertNotNull(Gate::getPolicyFor(ClientReport::class));
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/clients')->assertRedirect('/login');
    }

    public function test_a_sales_user_can_open_the_client_list(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('sales');

        $this->actingAs($sales)->get('/clients')->assertOk();
    }

    public function test_the_host_supplies_real_financial_data_and_core_falls_back_to_nothing(): void
    {
        // The host binds the Eloquent implementation, overriding core's null fallback.
        $this->assertNotInstanceOf(NullClientFinancialSummary::class, $this->app->make(ClientFinancialSummary::class));

        $null = new NullClientFinancialSummary;
        $this->assertTrue($null->invoices(1)->isEmpty());
        $this->assertSame(
            ['total_billed' => 0.0, 'total_collected' => 0.0, 'total_overdue' => 0.0],
            $null->totals(1)
        );
    }
}
