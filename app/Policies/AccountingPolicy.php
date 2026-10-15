<?php

namespace App\Policies;

use App\Models\User;

class AccountingPolicy
{
    public function access(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }
}
