<?php

namespace Sledeci\KenyaPayroll\Policies;

use Sledeci\KenyaPayroll\Models\PayrollRun;
use App\Models\User;
use Sledeci\Core\Policies\ChecksModuleRoles;

/**
 * Access follows the "payroll" module in config/access.php.
 */
class PayrollRunPolicy
{
    use ChecksModuleRoles;

    protected function modules(): array
    {
        return ['payroll'];
    }

    protected function adminDenied(): array
    {
        return ['update', 'delete', 'compute', 'approve', 'markPaid', 'forceDelete'];
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
    public function view(User $user, PayrollRun $payrollRun): bool
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
    public function update(User $user, PayrollRun $payrollRun): bool
    {
        return $this->canWrite($user) && $payrollRun->status === 'draft';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, PayrollRun $payrollRun): bool
    {
        return $this->canWrite($user) && $payrollRun->status === 'draft';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, PayrollRun $payrollRun): bool
    {
        return $this->canWrite($user);
    }

    /**
     * Permanent deletion is never allowed through the application.
     */
    public function forceDelete(User $user, PayrollRun $payrollRun): bool
    {
        return false;
    }

    /**
     * Compute or recompute payslips before approval.
     */
    public function compute(User $user, PayrollRun $payrollRun): bool
    {
        return $this->canWrite($user) && in_array($payrollRun->status, ['draft', 'processing'], true);
    }

    /**
     * Approve a computed run.
     */
    public function approve(User $user, PayrollRun $payrollRun): bool
    {
        return $this->canWrite($user) && $payrollRun->status === 'processing';
    }

    /**
     * Mark an approved run as paid.
     */
    public function markPaid(User $user, PayrollRun $payrollRun): bool
    {
        return $this->canWrite($user) && $payrollRun->status === 'approved';
    }
}
