<?php

namespace Sledeci\Accounting\Policies;

use App\Models\User;
use Sledeci\Accounting\Models\ForexRate;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "forex-rates" module in config/access.php.
 */
class ForexRatePolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['forex-rates'];
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
    public function view(User $user, ForexRate $forexRate): bool
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
    public function update(User $user, ForexRate $forexRate): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ForexRate $forexRate): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ForexRate $forexRate): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, ForexRate $forexRate): bool
    {
        return false;
    }
}
