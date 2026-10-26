<?php

namespace Tests\Feature;

use App\Models\CompanySetting;
use Sledeci\KenyaPayroll\Models\Employee;
use Sledeci\KenyaPayroll\Models\PayrollRun;
use App\Models\User;
use Sledeci\KenyaPayroll\Services\PayrollRunService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PayrollRunTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs($this->userWithRole('human resource'));
    }

    private function employee(array $o = []): Employee
    {
        return Employee::factory()->create(array_merge(['active' => true, 'basic_salary' => 100_000], $o));
    }

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->assignRole(Role::findOrCreate($role, 'web'));

        return $u;
    }

    public function test_run_can_be_recomputed_after_the_first_compute(): void
    {
        $emp = $this->employee();
        $svc = app(PayrollRunService::class);
        $run = $svc->create(2026, 5);

        $svc->compute($run);
        $this->assertSame('processing', $run->fresh()->status);

        $emp->update(['basic_salary' => 200_000]);
        $svc->compute($run->fresh());   // previously threw "Only draft payroll runs can be computed."

        $this->assertSame(200_000.0, (float) $run->fresh()->payslips()->first()->basic_salary);
    }

    public function test_recompute_removes_payslips_of_employees_no_longer_active(): void
    {
        $stay = $this->employee();
        $leave = $this->employee();
        $svc = app(PayrollRunService::class);
        $run = $svc->create(2026, 6);
        $svc->compute($run);
        $this->assertSame(2, $run->payslips()->count());

        $leave->update(['active' => false]);
        $svc->compute($run->fresh());

        $this->assertSame([$stay->id], $run->payslips()->pluck('employee_id')->all());
    }

    public function test_cannot_recompute_an_approved_run(): void
    {
        $this->employee();
        $svc = app(PayrollRunService::class);
        $run = $svc->create(2026, 7);
        $svc->compute($run);
        $svc->approve($run->fresh());

        $this->expectException(\RuntimeException::class);
        $svc->compute($run->fresh());
    }

    public function test_maker_checker_blocks_the_creator_from_approving_when_enabled(): void
    {
        $this->employee();
        $maker = $this->userWithRole('human resource');
        $this->actingAs($maker);

        $svc = app(PayrollRunService::class);
        $run = $svc->create(2026, 8);
        $svc->compute($run);

        $settings = CompanySetting::current();
        $settings->forceFill(['maker_checker_enabled' => true])->save();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Maker-checker');
        $svc->approve($run->fresh(), $maker->id);
    }

    public function test_a_different_user_may_approve_when_maker_checker_is_enabled(): void
    {
        $this->employee();
        $maker = $this->userWithRole('human resource');
        $checker = $this->userWithRole('finance');
        $this->actingAs($maker);

        $svc = app(PayrollRunService::class);
        $run = $svc->create(2026, 9);
        $svc->compute($run);
        CompanySetting::current()->forceFill(['maker_checker_enabled' => true])->save();

        $svc->approve($run->fresh(), $checker->id);

        $this->assertSame('approved', $run->fresh()->status);
    }

    public function test_approving_a_draft_run_shows_an_error_message_not_a_500(): void
    {
        $user = $this->userWithRole('finance');
        $run = PayrollRun::create(['created_by' => $user->id, 'year' => 2026, 'month' => 10, 'reference' => 'PAYROLL-2026-10', 'status' => 'draft']);

        $this->actingAs($user)->post("/payroll/runs/{$run->id}/approve")
            ->assertSessionHas('error');
    }

    public function test_viewer_cannot_use_payroll(): void
    {
        $this->actingAs($this->userWithRole('viewer'))->get('/payroll')->assertForbidden();
    }
}
