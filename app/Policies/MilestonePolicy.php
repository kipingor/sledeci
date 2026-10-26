<?php

namespace App\Policies;

use App\Models\Milestone;
use App\Models\User;

class MilestonePolicy
{
    public function view(User $user, Milestone $milestone): bool
    {
        return $user->hasRole('admin') ||
               $milestone->project->owner_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'project manager']);
    }

    public function update(User $user, Milestone $milestone): bool
    {
        return $user->hasRole('admin') ||
               $milestone->project->owner_id === $user->id;
    }

    public function delete(User $user, Milestone $milestone): bool
    {
        return $user->hasRole('admin');
    }
}
