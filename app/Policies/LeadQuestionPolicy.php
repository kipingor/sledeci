<?php

namespace App\Policies;

use App\Models\User;
use App\Models\LeadQuestion;

class LeadQuestionPolicy
{
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales']);
    }

    public function update(User $user, LeadQuestion $question): bool
    {
        return $user->hasRole('admin') ||
               $question->lead->owner_id === $user->id;
    }

    public function delete(User $user, LeadQuestion $question): bool
    {
        return $user->hasRole('admin') ||
               $question->lead->created_by === $user->id;
    }
}
