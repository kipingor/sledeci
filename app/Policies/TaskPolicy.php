<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Task;

class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        return $user->hasRole('admin') ||
               $task->assigned_to === $user->id ||
               $task->project->owner_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'project-manager']);
    }

    public function update(User $user, Task $task): bool
    {
        return $user->hasRole('admin') ||
               $task->assigned_to === $user->id ||
               $task->project->owner_id === $user->id;
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->hasRole('admin');
    }
}
