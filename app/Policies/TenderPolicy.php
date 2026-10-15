<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Tender;

class TenderPolicy
{
    public function view(User $user, Tender $tender): bool
    {
        return $user->hasRole('admin') || $tender->owner_id === $user->id;
    }

    public function update(User $user, Tender $tender): bool
    {
        return $user->hasRole('admin') || $tender->owner_id === $user->id;
    }

    public function delete(User $user, Tender $tender): bool
    {
        return $user->hasRole('admin') || $tender->owner_id === $user->id;
    }
}
