<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Activity;

class ActivityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales', 'manager']);
    }

    public function view(User $user, Activity $activity): bool
    {
        return $user->hasRole('admin') ||
               $activity->causer_id === $user->id ||
               $activity->subject?->owner_id === $user->id  ||
               $user->hasRole('admin');
    }
}
