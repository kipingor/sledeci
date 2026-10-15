<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Opportunity;

class OpportunityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales', 'manager']);
    }

    public function view(User $user, Opportunity $opportunity): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $opportunity->owner_id === $user->id ||
               $opportunity->created_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales']);
    }

    public function update(User $user, Opportunity $opportunity): bool
    {
        return $user->hasRole('admin') ||
               $opportunity->owner_id === $user->id ||
               $opportunity->created_by === $user->id;
    }

    public function delete(User $user, Opportunity $opportunity): bool
    {
        return $user->hasRole('admin') ||
               $opportunity->created_by === $user->id;
    }
}
