<?php

namespace App\Services\Payroll;

use App\Models\CompanySetting;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Orchestrates the lifecycle of a payroll run: creation, computation of
 * payslips for all active employees, approval, and marking as paid.
 *
 * Delegates the actual statutory math (PAYE, NSSF, SHIF, Housing Levy) to
 * KenyaPayrollService so this class only handles persistence and run state.
 */
class PayrollRunService
{
    public function __construct(private readonly KenyaPayrollService $calculator) {}

    public function create(int $year, int $month, ?string $notes = null): PayrollRun
    {
        return PayrollRun::create([
            'created_by' => Auth::id(),
            'year' => $year,
            'month' => $month,
            'reference' => sprintf('PAYROLL-%d-%02d', $year, $month),
            'status' => 'draft',
            'notes' => $notes,
        ]);
    }

    /**
     * Compute payslips for every active employee against this run.
     * Safe to re-run on a draft run — payslips are upserted per employee.
     *
     * @return int Number of employees processed.
     */
    public function compute(PayrollRun $run): int
    {
        if (! $run->canCompute()) {
            throw new RuntimeException('Only draft or processing payroll runs can be computed.');
        }

        return DB::transaction(function () use ($run) {
            $employees = Employee::where('active', true)->get();

            // Re-computing must not leave payslips for employees who are no longer active
            // (they would otherwise be approved and marked paid with stale figures).
            $run->payslips()->whereNotIn('employee_id', $employees->pluck('id'))->delete();

            $totals = [
                'total_gross' => 0.0,
                'total_paye' => 0.0,
                'total_nhif' => 0.0,
                'total_nssf' => 0.0,
                'total_housing_levy' => 0.0,
                'total_net' => 0.0,
                'total_employer_nssf' => 0.0,
            ];

            foreach ($employees as $employee) {
                $result = $this->calculator->compute(
                    basicSalary: (float) $employee->basic_salary,
                    houseAllowance: (float) $employee->house_allowance,
                    transportAllowance: (float) $employee->transport_allowance,
                    otherAllowances: (float) $employee->other_allowances,
                    helb: (float) $employee->helb_deduction,
                );

                Payslip::updateOrCreate(
                    [
                        'payroll_run_id' => $run->id,
                        'employee_id' => $employee->id,
                    ],
                    [
                        'basic_salary' => $employee->basic_salary,
                        'house_allowance' => $employee->house_allowance,
                        'transport_allowance' => $employee->transport_allowance,
                        'other_allowances' => $employee->other_allowances,
                        'gross_pay' => $result['gross_pay'],
                        'paye' => $result['paye'],
                        'nhif' => $result['nhif'],
                        'nssf_employee' => $result['nssf_employee'],
                        'nssf_employer' => $result['nssf_employer'],
                        'housing_levy' => $result['housing_levy'],
                        'helb' => $result['helb'],
                        'other_deductions' => $result['other_deductions'],
                        'total_deductions' => $result['total_deductions'],
                        'net_pay' => $result['net_pay'],
                        'payment_status' => 'pending',
                    ]
                );

                $totals['total_gross'] += $result['gross_pay'];
                $totals['total_paye'] += $result['paye'];
                $totals['total_nhif'] += $result['nhif'];
                $totals['total_nssf'] += $result['nssf_employee'];
                $totals['total_housing_levy'] += $result['housing_levy'];
                $totals['total_net'] += $result['net_pay'];
                $totals['total_employer_nssf'] += $result['nssf_employer'];
            }

            $run->update([...$totals, 'status' => 'processing']);

            return $employees->count();
        });
    }

    public function approve(PayrollRun $run, ?int $approverId = null): void
    {
        if ($run->status !== 'processing') {
            throw new RuntimeException('Only a computed (processing) run can be approved.');
        }

        // Separation of duties: honour the company's global maker-checker switch.
        if ($approverId !== null
            && $approverId === (int) $run->created_by
            && CompanySetting::current()->maker_checker_enabled) {
            throw new RuntimeException('Maker-checker: a payroll run must be approved by someone other than its creator.');
        }

        $run->update(['status' => 'approved']);
    }

    public function markPaid(PayrollRun $run, string $paymentDate): void
    {
        if ($run->status !== 'approved') {
            throw new RuntimeException('Only an approved run can be marked as paid.');
        }

        DB::transaction(function () use ($run, $paymentDate) {
            $run->update([
                'status' => 'paid',
                'payment_date' => $paymentDate,
            ]);

            $run->payslips()->update([
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);
        });
    }
}
