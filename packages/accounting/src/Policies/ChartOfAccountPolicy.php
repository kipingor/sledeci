<?php

namespace Sledeci\Accounting\Policies;

use Sledeci\Accounting\Models\ChartOfAccount;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "chart-of-accounts" module in config/access.php.
 */
class ChartOfAccountPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['chart-of-accounts'];
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
    public function view(User $user, ChartOfAccount $chartOfAccount): bool
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
    public function update(User $user, ChartOfAccount $chartOfAccount): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ChartOfAccount $chartOfAccount): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ChartOfAccount $chartOfAccount): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, ChartOfAccount $chartOfAccount): bool
    {
        return false;
    }
}
