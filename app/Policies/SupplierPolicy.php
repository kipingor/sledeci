<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Supplier;

class SupplierPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'procurement']);
    }

    public function view(User $user, Supplier $supplier): bool
    {
        return $user->hasAnyRole(['admin', 'procurement']);
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('procurement');
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return $user->hasRole('admin') || $user->hasRole('procurement');
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return $user->hasRole('admin');
    }
}
