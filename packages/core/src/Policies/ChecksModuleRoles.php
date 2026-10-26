<?php

namespace Sledeci\Core\Policies;

use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Role checks for policies, driven by config/access.php.
 *
 * This mirrors App\Http\Middleware\EnforceModuleAccess so a policy and the
 * route middleware can never disagree about who may use a module:
 *
 *  - the admin role may do everything, except abilities listed in adminDenied()
 *    (used for rules that must hold for everyone, e.g. "posted journals are immutable");
 *  - a module missing from config/access.php (or mapped to null) is open to any role;
 *  - roles listed in access.read_only_roles may read but never write;
 *  - a user with no role is denied everywhere.
 *
 * A module key of '@admin' means "administrators only".
 */
trait ChecksModuleRoles
{
    /**
     * Keys of config('access.modules') this policy's model belongs to.
     *
     * @return list<string>
     */
    abstract protected function modules(): array;

    /**
     * Abilities the admin role does NOT automatically pass. The policy method
     * itself decides these, so business rules apply to administrators too.
     *
     * @return list<string>
     */
    protected function adminDenied(): array
    {
        return ['forceDelete'];
    }

    public function before(Authenticatable $user, string $ability): ?bool
    {
        if ($this->isAdmin($user) && ! in_array($ability, $this->adminDenied(), true)) {
            return true;
        }

        return null;
    }

    protected function isAdmin(Authenticatable $user): bool
    {
        return $user->hasRole(config('access.admin_role', 'admin'));
    }

    protected function canRead(Authenticatable $user): bool
    {
        return $this->canReadModules($user, $this->modules());
    }

    protected function canWrite(Authenticatable $user): bool
    {
        return $this->canWriteModules($user, $this->modules());
    }

    /**
     * @param  list<string>  $modules
     */
    protected function canReadModules(Authenticatable $user, array $modules): bool
    {
        return $this->matchingRoles($user, $modules) !== [];
    }

    /**
     * @param  list<string>  $modules
     */
    protected function canWriteModules(Authenticatable $user, array $modules): bool
    {
        $writable = array_diff($this->matchingRoles($user, $modules), config('access.read_only_roles', []));

        return $writable !== [];
    }

    /**
     * The user's roles that grant access to at least one of the modules.
     *
     * @param  list<string>  $modules
     * @return list<string>
     */
    private function matchingRoles(Authenticatable $user, array $modules): array
    {
        $roles = $user->getRoleNames()->all();

        if ($roles === []) {
            return [];
        }

        if ($this->isAdmin($user)) {
            return $roles;
        }

        $map = config('access.modules', []);
        $allowed = [];

        foreach ($modules as $module) {
            if ($module === '@admin') {
                continue; // administrators only
            }

            if (! array_key_exists($module, $map) || $map[$module] === null) {
                return $roles; // any role may use this module
            }

            $allowed = array_merge($allowed, $map[$module]);
        }

        return array_values(array_intersect($roles, array_unique($allowed)));
    }
}
