<?php

namespace Tests\Feature\Packages;

use App\Models\User;
use Database\Factories\EmployeeFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Sledeci\Core\Modules\ModuleRegistry;
use Sledeci\Hr\HrServiceProvider;
use Sledeci\Hr\Models\HrLeaveRequest;
use Sledeci\Hr\Policies\HrLeaveRequestPolicy;
use Sledeci\KenyaPayroll\KenyaPayrollServiceProvider;
use Sledeci\KenyaPayroll\Models\Employee;
use Sledeci\KenyaPayroll\Models\PayrollRun;
use Sledeci\KenyaPayroll\Policies\EmployeePolicy;
use Sledeci\KenyaPayroll\Policies\PayrollRunPolicy;
use Tests\TestCase;

/**
 * Extraction of staff/leave into packages/hr and employees/payroll into packages/kenya-payroll.
 * (Payroll arithmetic is covered by Tests\Unit\Payroll\KenyaPayrollServiceTest and Tests\Feature\PayrollRunTest.)
 */
class HrAndPayrollPackagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_both_packages_register_as_modules(): void
    {
        $loaded = $this->app->getLoadedProviders();
        $this->assertArrayHasKey(HrServiceProvider::class, $loaded);
        $this->assertArrayHasKey(KenyaPayrollServiceProvider::class, $loaded);

        $registry = $this->app->make(ModuleRegistry::class);
        $this->assertSame(['hr'], $registry->get('hr')->routeModules);
        $this->assertSame(['payroll'], $registry->get('kenya-payroll')->routeModules);
    }

    public function test_routes_keep_their_names_and_run_behind_auth_and_module_access(): void
    {
        $names = [
            'web.hr.index', 'web.hr.staff.index', 'web.hr.staff.show', 'web.hr.leave.approve',
            'web.payroll.index', 'web.payroll.employees.store', 'web.payroll.runs.compute', 'web.payroll.payslips.show', 'web.payroll.p9',
        ];

        foreach ($names as $name) {
            $route = Route::getRoutes()->getByName($name);

            $this->assertNotNull($route, "Route {$name} is missing");
            $this->assertContains('auth', $route->gatherMiddleware(), $name);
            $this->assertContains('module.access', $route->gatherMiddleware(), $name);
        }
    }

    public function test_package_hr_routes_do_not_swallow_the_hosts_recruitment_routes(): void
    {
        foreach (['/hr/jobs' => 'web.hr.jobs.index', '/hr/applications' => 'web.hr.applications.index', '/hr/staff' => 'web.hr.staff.index'] as $uri => $name) {
            $this->assertSame($name, Route::getRoutes()->match(Request::create($uri, 'GET'))->getName(), $uri);
        }
    }

    public function test_policies_are_registered_from_the_packages(): void
    {
        $this->assertInstanceOf(HrLeaveRequestPolicy::class, Gate::getPolicyFor(HrLeaveRequest::class));
        $this->assertInstanceOf(EmployeePolicy::class, Gate::getPolicyFor(Employee::class));
        $this->assertInstanceOf(PayrollRunPolicy::class, Gate::getPolicyFor(PayrollRun::class));
    }

    public function test_factories_are_found_although_the_models_left_app_models(): void
    {
        $this->assertInstanceOf(EmployeeFactory::class, Employee::factory());
    }

    public function test_module_access_still_applies(): void
    {
        $this->get('/payroll')->assertRedirect('/login');

        $sales = User::factory()->create();
        $sales->assignRole('sales'); // not a payroll or HR role

        $this->actingAs($sales)->get('/payroll')->assertForbidden();
        $this->actingAs($sales)->get('/hr')->assertForbidden();
    }
}
