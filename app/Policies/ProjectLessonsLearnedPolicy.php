<?php

namespace App\Policies;

use App\Models\ProjectLessonsLearned;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "projects" module in config/access.php.
 */
class ProjectLessonsLearnedPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['projects'];
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
    public function view(User $user, ProjectLessonsLearned $projectLessonsLearned): bool
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
    public function update(User $user, ProjectLessonsLearned $projectLessonsLearned): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ProjectLessonsLearned $projectLessonsLearned): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ProjectLessonsLearned $projectLessonsLearned): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, ProjectLessonsLearned $projectLessonsLearned): bool
    {
        return false;
    }
}
