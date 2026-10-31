<?php

namespace Tests\Feature\Packages;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Sledeci\Accounting\Models\ChartOfAccount;
use Sledeci\Accounting\Models\Expense;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Accounting\Models\Payment;
use Sledeci\Clients\Models\ClientFollowUp;
use Sledeci\Clients\Models\ClientReport;
use Sledeci\Hr\Models\HrLeaveRequest;
use Sledeci\Hr\Models\StaffProfile;
use Sledeci\KenyaPayroll\Models\Employee;
use Sledeci\KenyaPayroll\Models\PayrollRun;
use Sledeci\KenyaPayroll\Models\Payslip;
use Tests\TestCase;

/**
 * Package models are the only ownership path (App\Models proxies removed).
 */
class ModelOwnershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_package_models_resolve_and_are_not_duplicated_under_app_models(): void
    {
        $this->assertTrue(class_exists(Invoice::class));
        $this->assertTrue(class_exists(Payment::class));
        $this->assertTrue(class_exists(Expense::class));
        $this->assertTrue(class_exists(JournalEntry::class));
        $this->assertTrue(class_exists(ChartOfAccount::class));
        $this->assertTrue(class_exists(ClientFollowUp::class));
        $this->assertTrue(class_exists(ClientReport::class));
        $this->assertTrue(class_exists(HrLeaveRequest::class));
        $this->assertTrue(class_exists(StaffProfile::class));
        $this->assertTrue(class_exists(Employee::class));
        $this->assertTrue(class_exists(PayrollRun::class));
        $this->assertTrue(class_exists(Payslip::class));

        $this->assertFalse(class_exists(\App\Models\Invoice::class, false));
        $this->assertFalse(class_exists(\App\Models\Payment::class, false));
        $this->assertFalse(class_exists(\App\Models\Expense::class, false));
        $this->assertFalse(class_exists(\App\Models\Employee::class, false));
        $this->assertFalse(class_exists(\App\Models\ClientFollowUp::class, false));
        $this->assertFalse(class_exists(\App\Models\HrLeaveRequest::class, false));
    }

    public function test_accounting_config_defines_related_models(): void
    {
        $this->assertNotEmpty(config('accounting.user_model'));
        $this->assertNotEmpty(config('accounting.project_model'));
        $this->assertSame(\App\Models\User::class, config('accounting.user_model'));
    }

    public function test_clients_hr_and_payroll_config_are_merged(): void
    {
        $this->assertNotEmpty(config('clients.user_model'));
        $this->assertNotEmpty(config('hr.user_model'));
        $this->assertNotEmpty(config('kenya-payroll.user_model'));
    }

    public function test_invoice_table_name_is_stable(): void
    {
        $this->assertSame('invoices', (new Invoice)->getTable());
        $this->assertSame('payments', (new Payment)->getTable());
        $this->assertSame('expenses', (new Expense)->getTable());
    }
}
