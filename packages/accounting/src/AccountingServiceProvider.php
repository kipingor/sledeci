<?php

namespace Sledeci\Accounting;

use Illuminate\Console\Scheduling\Schedule;
use Sledeci\Accounting\Jobs\RefreshForexRatesJob;
use Sledeci\Accounting\Models\AccountingPeriod;
use Sledeci\Accounting\Models\ChartOfAccount;
use Sledeci\Accounting\Models\ExchangeRate;
use Sledeci\Accounting\Models\Expense;
use Sledeci\Accounting\Models\ForexRate;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Accounting\Models\JournalEntryLine;
use Sledeci\Accounting\Models\Payment;
use Sledeci\Accounting\Models\TaxCode;
use Sledeci\Accounting\Policies\AccountingPeriodPolicy;
use Sledeci\Accounting\Policies\ChartOfAccountPolicy;
use Sledeci\Accounting\Policies\ExchangeRatePolicy;
use Sledeci\Accounting\Policies\ExpensePolicy;
use Sledeci\Accounting\Policies\ForexRatePolicy;
use Sledeci\Accounting\Policies\InvoicePolicy;
use Sledeci\Accounting\Policies\JournalEntryLinePolicy;
use Sledeci\Accounting\Policies\JournalEntryPolicy;
use Sledeci\Accounting\Policies\PaymentPolicy;
use Sledeci\Accounting\Policies\TaxCodePolicy;
use Sledeci\Accounting\Services\EloquentClientFinancialSummary;
use Sledeci\Core\Contracts\ClientFinancialSummary;
use Sledeci\Core\Modules\Module;
use Sledeci\Core\Support\ModuleServiceProvider;

class AccountingServiceProvider extends ModuleServiceProvider
{
    public function register(): void
    {
        parent::register();

        // Lets the Clients module show invoices and balances. bind() (not bindIf) so it
        // replaces core's empty fallback.
        $this->app->bind(ClientFinancialSummary::class, EloquentClientFinancialSummary::class);
    }

    protected function module(): Module
    {
        return new Module(
            key: 'accounting',
            label: 'Accounting',
            // Route-name modules served by this package (see config/access.php).
            routeModules: [
                'accounting', 'invoices', 'payments', 'expenses', 'chart-of-accounts', 'accounting-periods',
                'journal-entries', 'accounting-reports', 'exchange-rates', 'forex-rates', 'financing',
            ],
            // Used only when the host config/access.php does not define these keys.
            roles: ['accountant', 'finance', 'manager', 'auditor'],
            navigation: [
                ['title' => 'Invoices', 'href' => '/invoices', 'icon' => 'Receipt'],
                ['title' => 'Payments', 'href' => '/payments', 'icon' => 'CreditCard'],
                ['title' => 'Expenses', 'href' => '/expenses', 'icon' => 'Wallet'],
                ['title' => 'Accounting', 'href' => '/accounting', 'icon' => 'Landmark'],
            ],
        );
    }

    protected function policies(): array
    {
        return [
            AccountingPeriod::class => AccountingPeriodPolicy::class,
            ChartOfAccount::class => ChartOfAccountPolicy::class,
            ExchangeRate::class => ExchangeRatePolicy::class,
            Expense::class => ExpensePolicy::class,
            ForexRate::class => ForexRatePolicy::class,
            Invoice::class => InvoicePolicy::class,
            JournalEntry::class => JournalEntryPolicy::class,
            JournalEntryLine::class => JournalEntryLinePolicy::class,
            Payment::class => PaymentPolicy::class,
            TaxCode::class => TaxCodePolicy::class,
        ];
    }

    public function boot(): void
    {
        parent::boot();

        // The Clients package follows invoice links through this model.
        config(['clients.invoice_model' => Invoice::class]);

        $this->callAfterResolving(Schedule::class, function (Schedule $schedule) {
            $schedule->job(new RefreshForexRatesJob)->hourly()->withoutOverlapping();
        });
    }
}
