<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Conversation;

class ConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales']);
    }

    public function view(User $user, Conversation $conversation): bool
    {
        return $user->hasRole('admin') ||
               $conversation->lead->owner_id === $user->id ||
               $conversation->created_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales']);
    }

    public function update(User $user, Conversation $conversation): bool
    {
        return $user->hasRole('admin') ||
               $conversation->created_by === $user->id;
    }

    public function delete(User $user, Conversation $conversation): bool
    {
        return $user->hasRole('admin');
    }
}
