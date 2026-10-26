<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /** All available system roles */
    public function index(Request $request): Response
    {
        $query = User::with('roles')
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($q2) => $q2->where('name', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
            )
            )
            ->when($request->filled('role'), fn ($q) => $q->whereHas('roles', fn ($q2) => $q2->where('name', $request->role))
            );

        $users = $query->orderBy('name')->paginate(25)->withQueryString();

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role']),
            'roles' => $this->roleNames(),
            'roleStats' => collect($this->roleNames())->mapWithKeys(fn ($r) => [
                $r => User::role($r)->count(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('users/create', [
            'roles' => $this->roleNames(),
        ]);
    }

    /** Role names that actually exist (seeded by RoleSeeder). */
    private function roleNames(): array
    {
        return Role::orderBy('name')->pluck('name')->all();
    }

    /**
     * Privilege-escalation guard: only an admin may grant or revoke the admin
     * role, and the last remaining admin may not be demoted.
     */
    private function guardAdminRole(Request $request, array $newRoles, ?User $target = null): void
    {
        $actor = $request->user();
        $touchAdmin = in_array('admin', $newRoles, true) || ($target && $target->hasRole('admin'));

        if ($touchAdmin && ! $actor->hasRole('admin')) {
            abort(403, 'Only an administrator can grant or change the admin role.');
        }

        if ($target && $target->hasRole('admin') && ! in_array('admin', $newRoles, true)
            && User::role('admin')->count() <= 1) {
            abort(422, 'You cannot remove the last administrator.');
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', 'in:'.implode(',', $this->roleNames())],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $this->guardAdminRole($request, $data['roles']);

        // Generate a random password if none provided
        $password = $data['password'] ?? Str::random(16);
        $mustChange = empty($data['password']);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($password),
        ]);

        $user->syncRoles($data['roles']);

        // Mark email as verified — admin-created accounts don't need verification
        $user->markEmailAsVerified();

        // In production, send a welcome email with the generated password
        // Mail::to($user)->send(new WelcomeNewUser($user, $mustChange ? $password : null));

        $message = $mustChange
            ? "User created. Temporary password: {$password} — share this securely."
            : 'User created successfully.';

        return redirect()->route('web.users.index')
            ->with('success', $message);
    }

    public function edit(User $user): Response
    {
        $user->load('roles');

        return Inertia::render('users/edit', [
            'user' => array_merge($user->toArray(), [
                'role_names' => $user->getRoleNames()->values()->all(),
            ]),
            'roles' => $this->roleNames(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', "unique:users,email,{$user->id}"],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', 'in:'.implode(',', $this->roleNames())],
        ]);

        $this->guardAdminRole($request, $data['roles'], $user);

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
        ]);

        $user->syncRoles($data['roles']);

        return redirect()->route('web.users.index')
            ->with('success', "User {$user->name} updated.");
    }

    public function destroy(User $user): RedirectResponse
    {
        // Prevent self-deletion
        if ($user->id === Auth::id()) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        if ($user->hasRole('admin') && ! Auth::user()->hasRole('admin')) {
            abort(403, 'Only an administrator can remove an administrator.');
        }

        if ($user->hasRole('admin') && User::role('admin')->count() <= 1) {
            return back()->with('error', 'You cannot remove the last administrator.');
        }

        $user->delete();

        return redirect()->route('web.users.index')
            ->with('success', 'User removed.');
    }

    /**
     * Sync roles without updating other user fields.
     * Called from the role badge quick-assign UI on the index page.
     */
    public function syncRoles(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', 'in:'.implode(',', $this->roleNames())],
        ]);

        $this->guardAdminRole($request, $data['roles'], $user);

        $user->syncRoles($data['roles']);

        return back()->with('success', "Roles updated for {$user->name}.");
    }

    /**
     * Generate a new random password and show it to the admin.
     * The user will be forced to change it on next login.
     */
    public function resetPassword(User $user): RedirectResponse
    {
        $password = Str::random(12);
        $user->update(['password' => Hash::make($password)]);

        return back()->with('success', "Password reset. New temporary password: {$password}");
    }

    /**
     * Suspend or re-activate a user by toggling email_verified_at.
     * A null email_verified_at blocks login via the 'verified' middleware.
     */
    public function toggleActive(User $user): RedirectResponse
    {
        if ($user->id === Auth::id()) {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        if ($user->email_verified_at) {
            $user->update(['email_verified_at' => null]);
            $status = 'suspended';
        } else {
            $user->markEmailAsVerified();
            $status = 'reactivated';
        }

        return back()->with('success', "User {$user->name} {$status}.");
    }
}
