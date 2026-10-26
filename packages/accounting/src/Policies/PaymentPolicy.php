<?php

namespace Sledeci\Accounting\Policies;

use Sledeci\Accounting\Models\Payment;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "payments" module in config/access.php.
 */
class PaymentPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['payments'];
    }

    protected function adminDenied(): array
    {
        return ['update', 'delete', 'forceDelete'];
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
    public function view(User $user, Payment $payment): bool
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
    public function update(User $user, Payment $payment): bool
    {
        return $this->canWrite($user) && $payment->posting_status !== 'posted';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Payment $payment): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Payment $payment): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, Payment $payment): bool
    {
        return false;
    }

    /**
     * Update reconciliation status or link a payment to an invoice. Allowed on posted payments.
     */
    public function reconcile(User $user, Payment $payment): bool
    {
        return $this->canWrite($user);
    }
}
