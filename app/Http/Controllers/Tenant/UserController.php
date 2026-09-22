<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\InviteUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Spatie\Permission\Models\Role;

/**
 * Manages users within the current tenant context.
 *
 * All User queries are automatically scoped to the current tenant via the
 * BelongsToTenant global Eloquent scope — no manual tenant_id filtering needed.
 */
class UserController extends Controller
{
    public function index(): InertiaResponse
    {
        $users = User::with('roles')
            ->orderBy('name')
            ->paginate(20)
            ->through(fn (User $u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'is_active'  => $u->is_active,
                'role'       => $u->roles->first()?->name,
                'created_at' => $u->created_at->toDateString(),
            ]);

        return Inertia::render('Users/Index', compact('users'));
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('users/invite', [
            'roles' => Role::orderBy('name')->pluck('name'),
        ]);
    }

    public function store(InviteUserRequest $request): RedirectResponse
    {
        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'phone'     => $request->phone,
            'password'  => Hash::make(Str::random(32)), // set via invitation link later
            'is_active' => true,
        ]);

        $user->assignRole($request->role);

        return redirect()->route('users.index')
            ->with('success', "{$user->name} has been invited.");
    }

    public function edit(User $user): InertiaResponse
    {
        return Inertia::render('users/edit', [
            'user' => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'phone'     => $user->phone,
                'is_active' => $user->is_active,
                'role'      => $user->roles->first()?->name,
            ],
            'roles' => Role::orderBy('name')->pluck('name'),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $user->update($request->only(['name', 'phone', 'is_active']));

        if ($request->filled('role')) {
            $user->syncRoles([$request->role]);
        }

        return redirect()->route('users.index')
            ->with('success', "{$user->name} has been updated.");
    }

    public function destroy(User $user): RedirectResponse
    {
        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'User removed.');
    }
}
