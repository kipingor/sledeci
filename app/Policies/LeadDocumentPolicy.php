<?php

namespace App\Policies;

use App\Models\User;
use App\Models\LeadDocument;

class LeadDocumentPolicy
{
    public function view(User $user, LeadDocument $doc): bool
    {
        return $user->hasRole('admin') ||
               $doc->lead->created_by === $user->id ||
               $doc->lead->owner_id === $user->id;
    }

    public function upload(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'sales']);
    }

    public function delete(User $user, LeadDocument $doc): bool
    {
        return $user->hasRole('admin') ||
               $doc->lead->created_by === $user->id;
    }
}
