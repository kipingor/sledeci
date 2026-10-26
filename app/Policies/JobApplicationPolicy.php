<?php

namespace App\Policies;

use App\Models\JobApplication;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Applications contain personal data, so they follow the "hr" module and are
 * never created or deleted through the HR screens (candidates apply publicly).
 */
class JobApplicationPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['hr'];
    }

    protected function adminDenied(): array
    {
        return ['create', 'forceDelete'];
    }

    public function viewAny(User $user): bool
    {
        return $this->canRead($user);
    }

    public function view(User $user, JobApplication $jobApplication): bool
    {
        return $this->canRead($user);
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, JobApplication $jobApplication): bool
    {
        return $this->canWrite($user);
    }

    public function delete(User $user, JobApplication $jobApplication): bool
    {
        return $this->canWrite($user);
    }

    public function restore(User $user, JobApplication $jobApplication): bool
    {
        return false;
    }

    public function forceDelete(User $user, JobApplication $jobApplication): bool
    {
        return false;
    }
}
