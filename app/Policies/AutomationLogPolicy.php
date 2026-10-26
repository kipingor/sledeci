<?php

namespace App\Policies;

use App\Models\AutomationLog;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Append-only record: it is written by the system and cannot be changed or deleted
 * through the application, not even by an administrator.
 *
 * Access follows the "automation-logs" module in config/access.php.
 */
class AutomationLogPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['automation-logs'];
    }

    protected function adminDenied(): array
    {
        return ['create', 'update', 'delete', 'restore', 'forceDelete'];
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
    public function view(User $user, AutomationLog $automationLog): bool
    {
        return $this->canRead($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, AutomationLog $automationLog): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, AutomationLog $automationLog): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, AutomationLog $automationLog): bool
    {
        return false;
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, AutomationLog $automationLog): bool
    {
        return false;
    }
}
