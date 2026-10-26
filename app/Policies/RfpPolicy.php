<?php

namespace App\Policies;

use App\Models\Rfp;
use App\Models\User;

class RfpPolicy
{
    public function view(User $user, Rfp $rfp): bool
    {
        return $rfp->owner_id === $user->id || $user->hasRole(['admin', 'manager']);
    }

    public function update(User $user, Rfp $rfp): bool
    {
        return $rfp->owner_id === $user->id || $user->hasRole(['admin', 'manager']);
    }

    public function delete(User $user, Rfp $rfp): bool
    {
        return $rfp->owner_id === $user->id || $user->hasRole('admin');
    }
}
