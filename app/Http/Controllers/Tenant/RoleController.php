<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Spatie\Permission\Models\Role;

/**
 * Read-only listing of the roles available in this tenant.
 *
 * Roles are global (not per-tenant) — all tenants share the same role
 * definitions seeded by SeedTenantDefaults.  This controller exposes
 * them as read-only since role structure is platform-managed.
 */
class RoleController extends Controller
{
    public function index(): InertiaResponse
    {
        $roles = Role::with('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'name'             => $role->name,
                'permission_count' => $role->permissions->count(),
                'permissions'      => $role->permissions->pluck('name')->sort()->values(),
            ]);

        return Inertia::render('roles/index', compact('roles'));
    }
}
