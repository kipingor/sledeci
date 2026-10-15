<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;

class LeadPolicy
{
    /**
     * Determine whether the user can view any leads.
     */
    public function viewAny(User $user): bool
    {
        // viewer/auditor are read-only roles (writes are blocked by EnforceModuleAccess)
        return $user->hasAnyRole(['admin', 'sales', 'manager', 'viewer', 'auditor']);
    }

    /**
     * Determine whether the user can view the lead.
     */
    public function view(User $user, Lead $lead): bool
    {
        return $user->id === $lead->owner_id
            || $user->hasAnyRole(['admin', 'viewer', 'auditor']);
    }

    /**
     * Determine whether the user can create leads.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales']);
    }

    /**
     * Determine whether the user can update the lead.
     */
    public function update(User $user, Lead $lead): bool
    {
        return $user->hasRole('admin')
            || $user->id === $lead->owner_id
            || $user->id === $lead->created_by;
    }

    /**
     * Determine whether the user can delete the lead.
     */
    public function delete(User $user, Lead $lead): bool
    {
        return $user->id === $lead->owner_id
            || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can restore the lead.
     */
    public function restore(User $user, Lead $lead): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can permanently delete the lead.
     */
    public function forceDelete(User $user, Lead $lead): bool
    {
        return $user->hasRole('admin');
    }
}
