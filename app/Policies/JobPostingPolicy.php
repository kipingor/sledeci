<?php

namespace App\Policies;

use App\Models\JobPosting;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Job postings follow the "hr" module in config/access.php.
 */
class JobPostingPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['hr'];
    }

    public function viewAny(User $user): bool
    {
        return $this->canRead($user);
    }

    public function view(User $user, JobPosting $jobPosting): bool
    {
        return $this->canRead($user);
    }

    public function create(User $user): bool
    {
        return $this->canWrite($user);
    }

    public function update(User $user, JobPosting $jobPosting): bool
    {
        return $this->canWrite($user);
    }

    public function delete(User $user, JobPosting $jobPosting): bool
    {
        return $this->canWrite($user) && $jobPosting->applications()->doesntExist();
    }

    public function restore(User $user, JobPosting $jobPosting): bool
    {
        return $this->canWrite($user);
    }

    public function forceDelete(User $user, JobPosting $jobPosting): bool
    {
        return false;
    }

    /**
     * Publish, close or announce a posting on LinkedIn.
     */
    public function publish(User $user, JobPosting $jobPosting): bool
    {
        return $this->canWrite($user);
    }
}
