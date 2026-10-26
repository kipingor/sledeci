<?php

namespace Tests\Feature\Packages;

use App\Models\User;
use Database\Factories\ExpenseFactory;
use Database\Factories\InvoiceFactory;
use Database\Factories\PaymentFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Sledeci\Accounting\AccountingServiceProvider;
use Sledeci\Accounting\Models\Expense;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Accounting\Models\Payment;
use Sledeci\Accounting\Policies\InvoicePolicy;
use Sledeci\Accounting\Policies\JournalEntryPolicy;
use Sledeci\Accounting\Services\EloquentClientFinancialSummary;
use Sledeci\Core\Contracts\ClientFinancialSummary;
use Sledeci\Core\Modules\ModuleRegistry;
use Tests\TestCase;

/**
 * Extraction of the accounting module into packages/accounting.
 */
class AccountingPackageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_package_registers_itself_as_a_module(): void
    {
        $this->assertArrayHasKey(AccountingServiceProvider::class, $this->app->getLoadedProviders());

        $module = $this->app->make(ModuleRegistry::class)->get('accounting');

        $this->assertNotNull($module);
        $this->assertContains('invoices', $module->routeModules);
        $this->assertContains('journal-entries', $module->routeModules);
    }

    public function test_package_routes_keep_their_names_and_run_behind_auth_and_module_access(): void
    {
        $names = [
            'web.invoices.index', 'web.invoices.show', 'web.invoices.forex-rates', 'web.invoices.mpesa-push',
            'web.payments.index', 'web.expenses.store', 'web.accounting.index',
            'web.journal-entries.post', 'web.accounting-reports.trial-balance', 'web.chart-of-accounts.index',
            'web.financing.report',
        ];

        foreach ($names as $name) {
            $route = Route::getRoutes()->getByName($name);

            $this->assertNotNull($route, "Route {$name} is missing");
            $this->assertContains('auth', $route->gatherMiddleware(), $name);
            $this->assertContains('module.access', $route->gatherMiddleware(), $name);
        }
    }

    public function test_the_static_invoice_path_is_not_captured_by_the_invoice_wildcard(): void
    {
        $this->assertSame(
            'web.invoices.forex-rates',
            Route::getRoutes()->match(request()->create('/invoices/forex-rates', 'GET'))->getName()
        );
    }

    public function test_ledger_policies_are_registered_from_the_package(): void
    {
        $this->assertInstanceOf(InvoicePolicy::class, Gate::getPolicyFor(Invoice::class));
        $this->assertInstanceOf(JournalEntryPolicy::class, Gate::getPolicyFor(JournalEntry::class));
    }

    public function test_factories_are_found_although_the_models_left_app_models(): void
    {
        $this->assertInstanceOf(InvoiceFactory::class, Invoice::factory());
        $this->assertInstanceOf(PaymentFactory::class, Payment::factory());
        $this->assertInstanceOf(ExpenseFactory::class, Expense::factory());
    }

    public function test_the_package_supplies_client_financials_and_links_the_clients_package(): void
    {
        $this->assertInstanceOf(EloquentClientFinancialSummary::class, $this->app->make(ClientFinancialSummary::class));
        $this->assertSame(Invoice::class, config('clients.invoice_model'));

        $totals = $this->app->make(ClientFinancialSummary::class)->totals(999999);
        $this->assertSame(['total_billed' => 0.0, 'total_collected' => 0.0, 'total_overdue' => 0.0], $totals);
    }

    public function test_module_access_still_applies_to_the_moved_routes(): void
    {
        $this->get('/invoices')->assertRedirect('/login');

        $sales = User::factory()->create();
        $sales->assignRole('sales'); // sales is not in the invoices module

        $this->actingAs($sales)->get('/invoices')->assertForbidden();
    }
}
