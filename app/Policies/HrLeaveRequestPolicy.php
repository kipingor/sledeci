<?php

namespace App\Policies;

use App\Models\HrLeaveRequest;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "hr" module in config/access.php.
 */
class HrLeaveRequestPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['hr'];
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
    public function view(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return $this->canRead($user) || $this->isOwner($user, $hrLeaveRequest);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->getRoleNames()->isNotEmpty();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return $this->canWrite($user) || ($this->isOwner($user, $hrLeaveRequest) && $hrLeaveRequest->status === 'pending');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return $this->canWrite($user) || ($this->isOwner($user, $hrLeaveRequest) && $hrLeaveRequest->status === 'pending');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return false;
    }

    /**
     * Approve a pending leave request.
     */
    public function approve(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return $this->canWrite($user) && $hrLeaveRequest->status === 'pending';
    }

    /**
     * Reject a pending leave request.
     */
    public function reject(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return $this->canWrite($user) && $hrLeaveRequest->status === 'pending';
    }

    private function isOwner(User $user, HrLeaveRequest $hrLeaveRequest): bool
    {
        return $hrLeaveRequest->staffProfile?->user_id !== null
            && $hrLeaveRequest->staffProfile->user_id === $user->id;
    }
}
