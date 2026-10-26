<?php

namespace App\Policies;

use App\Models\SaccoAccount;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "sacco" module in config/access.php.
 */
class SaccoAccountPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['sacco'];
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->canRead($user);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, SaccoAccount $saccoAccount): bool
    {
        return $this->canRead($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, SaccoAccount $saccoAccount): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, SaccoAccount $saccoAccount): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, SaccoAccount $saccoAccount): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, SaccoAccount $saccoAccount): bool
    {
        return false;
    }
}
