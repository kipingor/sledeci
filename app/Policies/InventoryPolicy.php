<?php

namespace App\Policies;

use App\Models\User;

class InventoryPolicy
{
    public function access(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'manager']);
    }
}
