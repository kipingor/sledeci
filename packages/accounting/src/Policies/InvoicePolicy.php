<?php

namespace Sledeci\Accounting\Policies;

use Sledeci\Accounting\Models\Invoice;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "invoices" module in config/access.php.
 */
class InvoicePolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['invoices'];
    }

    protected function adminDenied(): array
    {
        return ['update', 'delete', 'cancel', 'submitToEtims', 'forceDelete'];
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
    public function view(User $user, Invoice $invoice): bool
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
    public function update(User $user, Invoice $invoice): bool
    {
        return $this->canWrite($user) && ! in_array($invoice->status, ['paid', 'cancelled'], true);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Invoice $invoice): bool
    {
        return $this->canWrite($user) && $invoice->status === 'draft' && $invoice->posting_status !== 'posted';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Invoice $invoice): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, Invoice $invoice): bool
    {
        return false;
    }

    /**
     * Cancel an open invoice (paid and already-cancelled invoices cannot be cancelled).
     */
    public function cancel(User $user, Invoice $invoice): bool
    {
        return $this->canWrite($user) && ! in_array($invoice->status, ['paid', 'cancelled'], true);
    }

    /**
     * Submit an issued invoice to KRA eTIMS (accountants and finance only; never drafts or cancelled invoices).
     */
    public function submitToEtims(User $user, Invoice $invoice): bool
    {
        return $this->canWriteModules($user, ['etims']) && ! in_array($invoice->status, ['draft', 'cancelled'], true);
    }
}
