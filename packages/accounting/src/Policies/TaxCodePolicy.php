<?php

namespace Sledeci\Accounting\Policies;

use App\Models\User;
use Sledeci\Accounting\Models\TaxCode;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "accounting" module in config/access.php.
 */
class TaxCodePolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['accounting'];
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
    public function view(User $user, TaxCode $taxCode): bool
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
    public function update(User $user, TaxCode $taxCode): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, TaxCode $taxCode): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, TaxCode $taxCode): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, TaxCode $taxCode): bool
    {
        return false;
    }
}
