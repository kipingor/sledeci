<?php

namespace App\Jobs;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SeedTenantDefaults implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public readonly Tenant $tenant) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        tenancy()->initialize($this->tenant);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = $this->permissions();

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $roles = [
            'admin' => $permissions,
            'sales' => $this->filterPermissions($permissions, [
                'contact', 'company', 'deal', 'activity',
                'lead', 'project', 'client',
            ]),
            'finance' => $this->filterPermissions($permissions, [
                'expense', 'payroll', 'invoice',
            ]),
            'ops' => $this->filterPermissions($permissions, [
                'project', 'task', 'document',
            ]),
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $role->syncPermissions($rolePermissions);
        }
    }

    /** @return list<string> */
    private function permissions(): array
    {
        return [
            // CRM — Contacts
            'contact.view', 'contact.create', 'contact.edit', 'contact.delete',
            // CRM — Companies
            'company.view', 'company.create', 'company.edit', 'company.delete',
            // CRM — Deals
            'deal.view', 'deal.create', 'deal.edit', 'deal.delete',
            // CRM — Activities
            'activity.view', 'activity.create', 'activity.edit', 'activity.delete',
            // Projects
            'project.view', 'project.create', 'project.edit', 'project.delete',
            'task.view', 'task.create', 'task.edit', 'task.delete',
            // Expenses
            'expense.view', 'expense.create', 'expense.edit', 'expense.delete',
            // Payroll
            'payroll.view', 'payroll.run', 'payroll.approve',
            // Documents
            'document.view', 'document.upload', 'document.delete',
            // Users & Settings
            'user.view', 'user.invite', 'user.manage',
            'settings.view', 'settings.edit',
        ];
    }

    /** @param list<string> $all @return list<string> */
    private function filterPermissions(array $all, array $prefixes): array
    {
        return array_values(array_filter(
            $all,
            fn (string $p) => collect($prefixes)->contains(fn ($prefix) => str_starts_with($p, $prefix)),
        ));
    }
}
