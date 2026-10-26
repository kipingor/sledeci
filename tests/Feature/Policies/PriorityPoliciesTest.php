<?php

namespace Tests\Feature\Policies;

use App\Models\Employee;
use App\Models\ImportJob;
use App\Models\PayrollRun;
use App\Models\User;
use App\Models\Workflow;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Accounting\Models\Payment;
use Tests\TestCase;

/**
 * Role x record-state matrices for the policies that replaced the deny-all
 * scaffolds. Roles come from database/seeders/RoleSeeder.php and the module map
 * from config/access.php (the same map EnforceModuleAccess uses).
 */
class PriorityPoliciesTest extends TestCase
{
    use RefreshDatabase;

    private function userWith(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    /**
     * @template T of Model
     *
     * @param  class-string<T>  $class
     * @return T
     */
    private function record(string $class, array $attributes): Model
    {
        return (new $class)->forceFill($attributes);
    }

    public function test_invoice_policy(): void
    {
        $accountant = $this->userWith('accountant');
        $auditor = $this->userWith('auditor');
        $manager = $this->userWith('manager');
        $sales = $this->userWith('sales');
        $admin = $this->userWith('admin');

        $draft = $this->record(Invoice::class, ['status' => 'draft', 'posting_status' => 'unposted']);
        $issued = $this->record(Invoice::class, ['status' => 'issued', 'posting_status' => 'posted']);
        $paid = $this->record(Invoice::class, ['status' => 'paid', 'posting_status' => 'posted']);

        // Reading follows the "invoices" module: accountant/finance/manager/auditor.
        $this->assertTrue($accountant->can('viewAny', Invoice::class));
        $this->assertTrue($auditor->can('view', $draft));
        $this->assertFalse($sales->can('viewAny', Invoice::class));

        // Writing excludes read-only roles.
        $this->assertTrue($accountant->can('create', Invoice::class));
        $this->assertFalse($auditor->can('create', Invoice::class));

        // Paid invoices are locked, for administrators too.
        $this->assertTrue($accountant->can('update', $draft));
        $this->assertFalse($accountant->can('update', $paid));
        $this->assertTrue($admin->can('update', $draft));
        $this->assertFalse($admin->can('update', $paid));

        // Only unposted drafts may be deleted.
        $this->assertTrue($accountant->can('delete', $draft));
        $this->assertFalse($accountant->can('delete', $issued));
        $this->assertFalse($admin->can('delete', $issued));

        // eTIMS: accountant/finance only, never drafts.
        $this->assertTrue($accountant->can('submitToEtims', $issued));
        $this->assertFalse($accountant->can('submitToEtims', $draft));
        $this->assertFalse($manager->can('submitToEtims', $issued));
        $this->assertFalse($admin->can('submitToEtims', $draft));

        // Permanent deletion is never allowed.
        $this->assertFalse($admin->can('forceDelete', $draft));
    }

    public function test_payment_policy(): void
    {
        $finance = $this->userWith('finance');
        $sales = $this->userWith('sales');
        $admin = $this->userWith('admin');

        $unposted = $this->record(Payment::class, ['posting_status' => 'unposted']);
        $posted = $this->record(Payment::class, ['posting_status' => 'posted']);

        $this->assertTrue($finance->can('view', $posted));
        $this->assertFalse($sales->can('viewAny', Payment::class));

        $this->assertTrue($finance->can('update', $unposted));
        $this->assertFalse($finance->can('update', $posted));
        $this->assertFalse($admin->can('update', $posted));

        // Reconciliation is still allowed on posted payments.
        $this->assertTrue($finance->can('reconcile', $posted));

        // Payments are reversed, never deleted, even by an administrator.
        $this->assertFalse($finance->can('delete', $unposted));
        $this->assertFalse($admin->can('delete', $unposted));
    }

    public function test_journal_entry_policy(): void
    {
        $accountant = $this->userWith('accountant');
        $viewer = $this->userWith('viewer');
        $admin = $this->userWith('admin');

        $draft = $this->record(JournalEntry::class, ['status' => 'draft', 'is_reversed' => false, 'is_reversal' => false]);
        $posted = $this->record(JournalEntry::class, ['status' => 'posted', 'is_reversed' => false, 'is_reversal' => false]);
        $reversed = $this->record(JournalEntry::class, ['status' => 'posted', 'is_reversed' => true, 'is_reversal' => false]);

        $this->assertTrue($accountant->can('viewAny', JournalEntry::class));
        $this->assertFalse($viewer->can('viewAny', JournalEntry::class));

        $this->assertTrue($accountant->can('update', $draft));
        $this->assertTrue($accountant->can('post', $draft));

        // A posted entry is immutable, for everyone, administrators included.
        $this->assertFalse($accountant->can('update', $posted));
        $this->assertFalse($admin->can('update', $posted));
        $this->assertFalse($admin->can('delete', $posted));
        $this->assertFalse($accountant->can('post', $posted));

        // Posted entries can be reversed once.
        $this->assertTrue($accountant->can('reverse', $posted));
        $this->assertFalse($accountant->can('reverse', $reversed));
        $this->assertFalse($accountant->can('reverse', $draft));
    }

    public function test_payroll_run_policy(): void
    {
        $hr = $this->userWith('human resource');
        $auditor = $this->userWith('auditor');
        $sales = $this->userWith('sales');
        $admin = $this->userWith('admin');

        $draft = $this->record(PayrollRun::class, ['status' => 'draft']);
        $processing = $this->record(PayrollRun::class, ['status' => 'processing']);
        $approved = $this->record(PayrollRun::class, ['status' => 'approved']);

        $this->assertTrue($hr->can('create', PayrollRun::class));
        $this->assertTrue($auditor->can('view', $approved));
        $this->assertFalse($auditor->can('create', PayrollRun::class));
        $this->assertFalse($sales->can('viewAny', PayrollRun::class));

        $this->assertTrue($hr->can('compute', $draft));
        $this->assertTrue($hr->can('approve', $processing));
        $this->assertFalse($hr->can('approve', $draft));
        $this->assertFalse($admin->can('approve', $draft));
        $this->assertTrue($hr->can('markPaid', $approved));
        $this->assertFalse($hr->can('markPaid', $processing));

        // Only drafts are editable or deletable.
        $this->assertTrue($hr->can('update', $draft));
        $this->assertFalse($hr->can('update', $approved));
        $this->assertFalse($admin->can('delete', $approved));
    }

    public function test_employee_policy(): void
    {
        $hr = $this->userWith('human resource');
        $accountant = $this->userWith('accountant');
        $viewer = $this->userWith('viewer');
        $admin = $this->userWith('admin');

        $someoneElse = $this->record(Employee::class, ['user_id' => $viewer->id + 1000]);
        $viewerOwn = $this->record(Employee::class, ['user_id' => $viewer->id]);

        $this->assertTrue($hr->can('view', $someoneElse));
        $this->assertFalse($viewer->can('view', $someoneElse));

        // An employee can always see their own record.
        $this->assertTrue($viewer->can('view', $viewerOwn));

        $this->assertTrue($hr->can('update', $someoneElse));
        $this->assertTrue($accountant->can('update', $someoneElse));

        // Only HR (and admin) may delete employees.
        $this->assertTrue($hr->can('delete', $someoneElse));
        $this->assertFalse($accountant->can('delete', $someoneElse));
        $this->assertTrue($admin->can('delete', $someoneElse));
        $this->assertFalse($admin->can('forceDelete', $someoneElse));
    }

    public function test_import_job_policy(): void
    {
        $owner = $this->userWith('viewer'); // owns the job although the role has no import module access
        $otherSales = $this->userWith('sales');
        $otherViewer = $this->userWith('viewer');

        $job = $this->record(ImportJob::class, ['user_id' => $owner->id]);

        $this->assertTrue($owner->can('view', $job));
        $this->assertTrue($owner->can('delete', $job));

        // Roles in the import-export module can see everyone's jobs.
        $this->assertTrue($otherSales->can('view', $job));

        // A role outside the module cannot see someone else's job.
        $this->assertFalse($otherViewer->can('view', $job));
        $this->assertFalse($otherViewer->can('delete', $job));
    }

    public function test_workflow_policy_follows_the_workflows_module(): void
    {
        $manager = $this->userWith('manager');
        $sales = $this->userWith('sales');

        $workflow = $this->record(Workflow::class, ['name' => 'x']);

        $this->assertTrue($manager->can('create', Workflow::class));
        $this->assertTrue($manager->can('update', $workflow));
        $this->assertFalse($sales->can('create', Workflow::class));
        $this->assertFalse($sales->can('update', $workflow));
    }
}
