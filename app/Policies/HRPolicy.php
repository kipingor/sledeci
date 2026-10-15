<?php

namespace App\Policies;

use App\Models\User;

class HRPolicy
{
    public function access(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'human resource']);
    }
}
