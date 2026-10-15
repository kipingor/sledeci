<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can create other users.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }
}
