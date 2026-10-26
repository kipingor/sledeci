<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Proposal;

class ProposalPolicy
{
    /**
     * Determine whether the user can list proposals (same roles as the CRM module).
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales', 'manager', 'viewer', 'auditor']);
    }

    public function view(User $user, Proposal $proposal): bool
    {
        return $user->hasRole('admin') ||
               $proposal->lead->owner_id === $user->id ||
               $proposal->lead->created_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales', 'proposal-writer']);
    }

    public function update(User $user, Proposal $proposal): bool
    {
        return $user->hasRole('admin') ||
               $proposal->lead->owner_id === $user->id;
    }

    public function delete(User $user, Proposal $proposal): bool
    {
        return $user->hasRole('admin');
    }
}
