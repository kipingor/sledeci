<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Covers config/access.php + EnforceModuleAccess, and the user-management guards.
 */
class ModuleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['viewer', 'human resource', 'accountant', 'finance', 'auditor', 'project manager', 'field agent'] as $r) {
            Role::findOrCreate($r, 'web');
        }
    }

    private function userWith(?string $role): User
    {
        $user = User::factory()->create();
        if ($role) {
            $user->assignRole($role);
        }

        return $user;
    }

    public function test_user_without_any_role_is_denied_everywhere_except_dashboard(): void
    {
        $user = $this->userWith(null);

        $this->actingAs($user)->get('/dashboard')->assertOk();
        $this->actingAs($user)->get('/payroll')->assertForbidden();
        $this->actingAs($user)->get('/leads')->assertForbidden();
        $this->actingAs($user)->getJson('/api/v1/leads')->assertForbidden();
    }

    public function test_sales_cannot_open_payroll_or_hr(): void
    {
        $user = $this->userWith('sales');

        $this->actingAs($user)->get('/payroll')->assertForbidden();
        $this->actingAs($user)->get('/hr')->assertForbidden();
        $this->actingAs($user)->get('/invoices')->assertForbidden();
        $this->actingAs($user)->get('/leads')->assertOk();
    }

    public function test_accountant_can_reach_billing_but_not_crm(): void
    {
        $user = $this->userWith('accountant');

        $this->actingAs($user)->get('/invoices')->assertOk();
        $this->actingAs($user)->get('/leads')->assertForbidden();
    }

    public function test_human_resource_reaches_hr_and_payroll(): void
    {
        $user = $this->userWith('human resource');

        $this->actingAs($user)->get('/hr')->assertOk();
        $this->actingAs($user)->get('/payroll')->assertOk();
        $this->actingAs($user)->get('/users')->assertOk();
    }

    public function test_admin_has_access_to_everything(): void
    {
        $admin = $this->userWith('admin');

        $this->actingAs($admin)->get('/payroll')->assertOk();
        $this->actingAs($admin)->get('/hr')->assertOk();
        $this->actingAs($admin)->get('/leads')->assertOk();
    }

    public function test_viewer_can_read_but_not_modify(): void
    {
        $viewer = $this->userWith('viewer');

        $this->actingAs($viewer)->get('/leads')->assertOk();
        $this->actingAs($viewer)->deleteJson('/leads/bulk-delete', ['ids' => [1]])->assertForbidden();
        $this->actingAs($viewer)->postJson('/api/v1/leads', ['name' => 'x'])->assertForbidden();
    }

    public function test_viewer_cannot_see_finance_or_people_modules(): void
    {
        $viewer = $this->userWith('viewer');

        $this->actingAs($viewer)->get('/payroll')->assertForbidden();
        $this->actingAs($viewer)->get('/invoices')->assertForbidden();
    }

    public function test_company_settings_are_admin_only(): void
    {
        $this->actingAs($this->userWith('sales'))->get('/settings/company')->assertForbidden();
        $this->actingAs($this->userWith('finance'))->get('/settings/company')->assertForbidden();
        $this->actingAs($this->userWith('admin'))->get('/settings/company')->assertOk();
    }

    public function test_hr_cannot_grant_the_admin_role(): void
    {
        $hr = $this->userWith('human resource');

        $this->actingAs($hr)->post('/users', [
            'name'  => 'Sneaky',
            'email' => 'sneaky@example.com',
            'roles' => ['admin'],
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'sneaky@example.com']);
    }

    public function test_hr_can_create_a_non_admin_user_with_a_real_role_name(): void
    {
        $hr = $this->userWith('human resource');

        $this->actingAs($hr)->post('/users', [
            'name'  => 'New Hire',
            'email' => 'hire@example.com',
            'roles' => ['project manager'], // previously the UI sent 'pm', which threw RoleDoesNotExist
        ])->assertRedirect();

        $this->assertTrue(User::where('email', 'hire@example.com')->first()->hasRole('project manager'));
    }

    public function test_the_last_admin_cannot_be_deleted(): void
    {
        $admin = $this->userWith('admin');
        $other = $this->userWith('admin');

        // Deleting one of two admins is fine…
        $this->actingAs($admin)->delete("/users/{$other->id}")->assertRedirect();

        // …but the sole remaining admin is protected (and self-delete is blocked too).
        $this->assertSame(1, User::role('admin')->count());
        $this->actingAs($admin)->delete("/users/{$admin->id}");
        $this->assertSame(1, User::role('admin')->count());
    }

    public function test_two_factor_secrets_are_not_serialized(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['two_factor_secret' => 'secret', 'two_factor_recovery_codes' => 'codes']);

        $this->assertArrayNotHasKey('two_factor_secret', $user->toArray());
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $user->toArray());
    }

    public function test_every_role_referenced_in_the_access_map_is_seeded(): void
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $known = Role::pluck('name')->all();

        $referenced = collect(config('access.modules'))->flatten()->merge(config('access.read_only_roles'))->unique()->filter();

        $this->assertSame([], $referenced->diff($known)->values()->all(), 'config/access.php references roles that RoleSeeder does not create');
    }

    public function test_self_registration_is_closed_when_disabled(): void
    {
        config(['fortify.registration_enabled' => false]);

        $this->get('/register')->assertNotFound();
        $this->post('/register', [
            'name' => 'Stranger', 'email' => 'stranger@example.com',
            'password' => 'Str0ng-Passw0rd!', 'password_confirmation' => 'Str0ng-Passw0rd!',
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'stranger@example.com']);
    }

    public function test_self_registered_users_get_no_role_and_no_module_access(): void
    {
        config(['fortify.registration_enabled' => true]);

        $this->post('/register', [
            'name' => 'Newcomer', 'email' => 'newcomer@example.com',
            'password' => 'Str0ng-Passw0rd!', 'password_confirmation' => 'Str0ng-Passw0rd!',
        ]);

        $user = User::where('email', 'newcomer@example.com')->firstOrFail();
        $this->assertCount(0, $user->getRoleNames());

        $user->markEmailAsVerified();
        $this->actingAs($user)->get('/payroll')->assertForbidden();
        $this->actingAs($user)->get('/invoices')->assertForbidden();
    }
}
