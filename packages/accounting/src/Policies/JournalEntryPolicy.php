<?php

namespace Sledeci\Accounting\Policies;

use App\Models\User;
use Sledeci\Accounting\Models\JournalEntry;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "journal-entries" module in config/access.php.
 */
class JournalEntryPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['journal-entries'];
    }

    protected function adminDenied(): array
    {
        return ['update', 'delete', 'post', 'reverse', 'forceDelete'];
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->canRead($user);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, JournalEntry $journalEntry): bool
    {
        return $this->canRead($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, JournalEntry $journalEntry): bool
    {
        return $this->canWrite($user) && $journalEntry->status === 'draft';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, JournalEntry $journalEntry): bool
    {
        return $this->canWrite($user) && $journalEntry->status === 'draft';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, JournalEntry $journalEntry): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, JournalEntry $journalEntry): bool
    {
        return false;
    }

    /**
     * Post a draft entry to the ledger.
     */
    public function post(User $user, JournalEntry $journalEntry): bool
    {
        return $this->canWrite($user) && $journalEntry->status === 'draft';
    }

    /**
     * Reverse a posted entry (only once, and never a reversal itself).
     */
    public function reverse(User $user, JournalEntry $journalEntry): bool
    {
        return $this->canWrite($user) && $journalEntry->status === 'posted' && ! $journalEntry->is_reversed && ! $journalEntry->is_reversal;
    }
}
