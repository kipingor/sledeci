<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * BUG FIX: The original seeder passed a 'description' key to Role::create().
     * Spatie's default `roles` table (from create_permission_tables migration) does
     * NOT include a `description` column. This caused:
     *   QueryException: Column 'description' cannot be null (or similar)
     *
     * Fix: Remove 'description' from Role::create() calls. The role descriptions
     * are documented in the code comments below for reference.
     *
     * If you genuinely need a description column, add a migration:
     *   $table->string('description')->nullable()->after('name');
     * and then update Role::$fillable in your app's Role model extension.
     */
    public function run(): void
    {
        $roleNames = [
            'admin',
            'human resource',
            'accountant',
            'manager',
            'finance',
            'viewer',
            'project manager',
            'auditor',
            'sales',
            'field agent',
        ];

        foreach ($roleNames as $name) {
            Role::firstOrCreate(['name' => $name]);
        }

        $this->command->info('✓ Roles created: '.implode(', ', array_values($roleNames)));

        // ── Permissions ────────────────────────────────────────────────────────
        $permissions = [
            'view leads',    'create leads',    'edit leads',    'delete leads',    'move leads',
            'view opportunities', 'create opportunities', 'edit opportunities', 'delete opportunities',
            'view projects', 'create projects', 'edit projects', 'delete projects',
            'view pipelines', 'create pipelines', 'edit pipelines', 'delete pipelines',
            'manage users',  'view reports', 'manage settings', 'manage roles', 'manage permissions',
            'view financials', 'create financials', 'manage financials', 'delete financials',
            'view journal entries', 'create journal entries', 'manage journal entries', 'delete journal entries',
            'view invoices', 'create invoices', 'manage invoices', 'delete invoices',
            'view expenses', 'create expenses', 'manage expenses', 'delete expenses',
            'view clients', 'create clients', 'manage clients', 'delete clients',
            'view accounting', 'create accounting', 'manage accounting', 'delete accounting',
            'view charts of accounts', 'create charts of accounts', 'manage charts of accounts', 'delete charts of accounts',
            'view tax codes', 'create tax codes', 'manage tax codes', 'delete tax codes',
            'view accounting periods', 'create accounting periods', 'manage accounting periods', 'delete accounting periods',
            'view exchange rates', 'create exchange rates', 'manage exchange rates', 'delete exchange rates',
            'view audit logs', 'manage audit logs',
            'view settings',
        ];
        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $this->command->info('✓ Permissions created: '.implode(', ', array_values($permissions)));

        // ── Role → Permission mapping ──────────────────────────────────────────

        $adminRole = Role::where('name', 'admin')->first();
        $adminRole->syncPermissions(Permission::all());

        $hrRole = Role::where('name', 'human resource')->first();
        $hrRole->syncPermissions([
            'manage users', 'view reports', 'view financials', 'view invoices', 'view expenses', 'view clients',
        ]);

        $managerRole = Role::where('name', 'manager')->first();
        $managerRole->syncPermissions([
            'view leads', 'create leads', 'edit leads', 'move leads',
            'view opportunities', 'create opportunities', 'edit opportunities',
            'view projects', 'create projects', 'edit projects',
            'view pipelines', 'create pipelines', 'edit pipelines',
            'view reports', 'view financials', 'view invoices', 'view expenses', 'view clients',
        ]);

        $accountantRole = Role::where('name', 'accountant')->first();
        $accountantRole->syncPermissions([
            'view financials', 'create financials', 'manage financials', 'delete financials',
            'view journal entries', 'create journal entries', 'manage journal entries', 'delete journal entries',
            'view invoices', 'create invoices', 'manage invoices', 'delete invoices',
            'view expenses', 'create expenses', 'manage expenses', 'delete expenses',
            'view charts of accounts', 'create charts of accounts', 'manage charts of accounts', 'delete charts of accounts',
            'view tax codes', 'create tax codes', 'manage tax codes', 'delete tax codes',
            'view accounting periods', 'create accounting periods', 'manage accounting periods', 'delete accounting periods',
            'view exchange rates', 'create exchange rates', 'manage exchange rates', 'delete exchange rates',
        ]);

        $financeRole = Role::where('name', 'finance')->first();
        $financeRole->syncPermissions([
            'view financials', 'create financials', 'manage financials',
            'view journal entries', 'create journal entries', 'manage journal entries',
            'view invoices', 'create invoices', 'manage invoices',
            'view expenses', 'create expenses', 'manage expenses',
            'view charts of accounts', 'create charts of accounts', 'manage charts of accounts',
            'view tax codes', 'create tax codes', 'manage tax codes',
            'view accounting periods', 'create accounting periods', 'manage accounting periods',
            'view exchange rates', 'create exchange rates', 'manage exchange rates',
        ]);

        $viewerRole = Role::where('name', 'viewer')->first();
        $viewerRole->syncPermissions([
            'view leads', 'view opportunities', 'view projects', 'view pipelines',
            'view reports', 'view financials', 'view invoices', 'view expenses', 'view clients',
            'view charts of accounts', 'view tax codes', 'view accounting periods', 'view exchange rates',
            'view audit logs', 'view settings',
        ]);

        $projectManagerRole = Role::where('name', 'project manager')->first();
        $projectManagerRole->syncPermissions([
            'view leads', 'create leads', 'edit leads', 'move leads',
            'view opportunities', 'create opportunities', 'edit opportunities',
            'view projects', 'create projects', 'edit projects',
            'view pipelines', 'create pipelines', 'edit pipelines',
            'view invoices', 'create invoices', 'manage invoices',
            'view expenses', 'create expenses', 'manage expenses',
            'view clients', 'create clients', 'manage clients',
        ]);

        $auditorRole = Role::where('name', 'auditor')->first();
        $auditorRole->syncPermissions([
            'view financials', 'view journal entries', 'view invoices', 'view expenses',
            'view charts of accounts', 'view tax codes', 'view accounting periods', 'view exchange rates',
            'view audit logs',
        ]);

        $salesRole = Role::where('name', 'sales')->first();
        $salesRole->syncPermissions([
            'view leads', 'create leads', 'edit leads', 'move leads',
            'view opportunities', 'create opportunities', 'edit opportunities',
            'view projects',
            'view pipelines', 'create pipelines', 'edit pipelines',
            'view invoices', 'create invoices', 'manage invoices',
        ]);

        $this->command->info('✓ Roles synced with permissions');

        // ── Optionally assign admin role to the first user ─────────────────
        $firstUser = User::orderBy('id')->first();
        if ($firstUser && $firstUser->roles->isEmpty()) {
            $firstUser->assignRole('admin');
            $this->command->info("✓ Admin role assigned to first user: {$firstUser->email}");
        }
    }
}
