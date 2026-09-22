<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Str;

/**
 * Handles the complete lifecycle of provisioning a new tenant:
 *   signup → create Tenant record → attach domain → fire TenantCreated event
 *   → SeedTenantDefaults job runs (roles + permissions).
 *
 * Controllers stay thin — validate, delegate here, return response.
 */
class TenantProvisioningService
{
    /**
     * @param  array{name: string, subdomain: string, plan?: string}  $data
     */
    public function provision(array $data): Tenant
    {
        $slug = Str::slug($data['subdomain']);

        $tenant = Tenant::create([
            'id'             => $slug,
            'name'           => $data['name'],
            'slug'           => $slug,
            'status'         => 'trial',
            'plan'           => $data['plan'] ?? 'starter',
            'trial_ends_at'  => now()->addDays(14),
        ]);

        $tenant->domains()->create([
            'domain' => $slug . '.' . config('app.domain', 'nexus.co.ke'),
        ]);

        return $tenant;
    }

    public function suspend(Tenant $tenant): void
    {
        $tenant->update(['status' => 'suspended']);
    }

    public function activate(Tenant $tenant): void
    {
        $tenant->update(['status' => 'active']);
    }

    /**
     * Permanently delete a tenant and all their data.
     * Uses the cascade FK on tenant_id — all tenant-scoped rows are removed.
     * The tenant record (and its domain) are then deleted from central tables.
     */
    public function delete(Tenant $tenant): void
    {
        $tenant->domains()->delete();
        $tenant->delete();
    }
}
