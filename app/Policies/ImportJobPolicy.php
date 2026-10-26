<?php

namespace App\Policies;

use App\Models\ImportJob;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "import-export" module in config/access.php.
 */
class ImportJobPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['import-export'];
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
    public function view(User $user, ImportJob $importJob): bool
    {
        return $importJob->user_id === $user->id || $this->canRead($user);
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
    public function update(User $user, ImportJob $importJob): bool
    {
        return $importJob->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ImportJob $importJob): bool
    {
        return $importJob->user_id === $user->id || $this->canWrite($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ImportJob $importJob): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, ImportJob $importJob): bool
    {
        return false;
    }
}
