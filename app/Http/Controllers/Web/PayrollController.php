<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\Payroll\KenyaPayrollService;
use App\Services\Payroll\PayrollRunService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function __construct(
        private PayrollRunService $runService,
        private KenyaPayrollService $calculator,
    ) {}

    // ── Dashboard ──────────────────────────────────────────────────────────

    public function index(): Response
    {
        $runs = PayrollRun::with('creator:id,name')
            ->orderByDesc('year')->orderByDesc('month')
            ->paginate(12);

        $latestRun = PayrollRun::latest('id')->first();
        $employeeCount = Employee::where('active', true)->count();

        return Inertia::render('payroll/index', compact('runs', 'latestRun', 'employeeCount'));
    }

    // ── Employees ──────────────────────────────────────────────────────────

    public function employees(Request $request): Response
    {
        $employees = Employee::orderBy('last_name')
            ->when($request->filled('department'), fn ($q) => $q->where('department', $request->department))
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('active', true))
            ->paginate(30)->withQueryString();

        $departments = Employee::whereNotNull('department')->distinct()->pluck('department')->sort()->values();

        return Inertia::render('payroll/employees', compact('employees', 'departments'));
    }

    public function createEmployee(): Response
    {
        return Inertia::render('payroll/employee-form', ['employee' => null]);
    }

    public function storeEmployee(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'id_number' => 'nullable|string|max:20',
            'kra_pin' => 'nullable|string|max:20',
            'nssf_number' => 'nullable|string|max:20',
            'nhif_number' => 'nullable|string|max:20',
            'employment_type' => 'required|in:full_time,part_time,contract,casual',
            'department' => 'nullable|string|max:100',
            'job_title' => 'nullable|string|max:100',
            'hire_date' => 'required|date',
            'basic_salary' => 'required|numeric|min:0',
            'house_allowance' => 'nullable|numeric|min:0',
            'transport_allowance' => 'nullable|numeric|min:0',
            'other_allowances' => 'nullable|numeric|min:0',
            'helb_deduction' => 'nullable|numeric|min:0',
            'pay_frequency' => 'nullable|in:monthly,bi_weekly,weekly',
            'bank_name' => 'nullable|string|max:100',
            'bank_account_number' => 'nullable|string|max:50',
            'mpesa_phone' => 'nullable|string|max:20',
        ]);

        $count = Employee::withTrashed()->count() + 1;
        $data['employee_number'] = 'EMP-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);

        Employee::create($data);

        return redirect()->route('web.payroll.employees')->with('success', 'Employee added.');
    }

    public function editEmployee(Employee $employee): Response
    {
        return Inertia::render('payroll/employee-form', compact('employee'));
    }

    public function updateEmployee(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'kra_pin' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:100',
            'job_title' => 'nullable|string|max:100',
            'basic_salary' => 'required|numeric|min:0',
            'house_allowance' => 'nullable|numeric|min:0',
            'transport_allowance' => 'nullable|numeric|min:0',
            'other_allowances' => 'nullable|numeric|min:0',
            'helb_deduction' => 'nullable|numeric|min:0',
            'bank_account_number' => 'nullable|string|max:50',
            'mpesa_phone' => 'nullable|string|max:20',
            'active' => 'boolean',
            'termination_date' => 'nullable|date',
        ]);

        $employee->update($data);

        return back()->with('success', 'Employee updated.');
    }

    // ── Payroll runs ───────────────────────────────────────────────────────

    public function createRun(Request $request)
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2020|max:2099',
            'month' => 'required|integer|min:1|max:12',
            'notes' => 'nullable|string',
        ]);

        if (PayrollRun::where('year', $data['year'])->where('month', $data['month'])->exists()) {
            return back()->with('error', "A payroll run for {$data['year']}/{$data['month']} already exists.");
        }

        $run = $this->runService->create((int) $data['year'], (int) $data['month'], $data['notes'] ?? null);

        return redirect()->route('web.payroll.run', $run)->with('success', 'Payroll run created.');
    }

    public function showRun(PayrollRun $payrollRun): Response
    {
        $payslips = $payrollRun->payslips()
            ->with('employee:id,first_name,last_name,employee_number,department,job_title')
            ->get();

        return Inertia::render('payroll/run', [
            'run' => $payrollRun,
            'payslips' => $payslips,
        ]);
    }

    public function computeRun(PayrollRun $payrollRun)
    {
        if (! $payrollRun->canCompute()) {
            return back()->with('error', 'Only draft or processing runs can be computed.');
        }
        $count = $this->runService->compute($payrollRun);

        return back()->with('success', "Computed payslips for {$count} employees.");
    }

    public function approveRun(PayrollRun $payrollRun)
    {
        try {
            $this->runService->approve($payrollRun, Auth::id());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Payroll run approved. Ready for payment.');
    }

    public function markRunPaid(Request $request, PayrollRun $payrollRun)
    {
        $data = $request->validate(['payment_date' => 'required|date']);
        try {
            $this->runService->markPaid($payrollRun, $data['payment_date']);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Payroll run marked as paid.');
    }

    // ── Pay calculator (live preview before running payroll) ───────────────

    public function calculate(Request $request)
    {
        $data = $request->validate([
            'basic_salary' => 'required|numeric|min:0',
            'house_allowance' => 'nullable|numeric|min:0',
            'transport_allowance' => 'nullable|numeric|min:0',
            'other_allowances' => 'nullable|numeric|min:0',
            'helb_deduction' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
        ]);

        $result = $this->calculator->compute(
            basicSalary: (float) $data['basic_salary'],
            houseAllowance: (float) ($data['house_allowance'] ?? 0),
            transportAllowance: (float) ($data['transport_allowance'] ?? 0),
            otherAllowances: (float) ($data['other_allowances'] ?? 0),
            helb: (float) ($data['helb_deduction'] ?? 0),
            otherDeductions: (float) ($data['other_deductions'] ?? 0),
        );

        return response()->json($result);
    }

    // ── Payslip detail ─────────────────────────────────────────────────────

    public function payslip(Payslip $payslip): Response
    {
        $payslip->load('employee', 'run', 'deductions');

        return Inertia::render('payroll/payslip', compact('payslip'));
    }

    // ── P9 / P10 export (KRA annual returns) ──────────────────────────────

    public function p9Export(int $year)
    {
        $employees = Employee::with(['payslips' => fn ($q) => $q->whereHas('run', fn ($r) => $r->where('year', $year)->where('status', 'paid')),
        ])->where('active', true)->get();

        return response()->json([
            'year' => $year,
            'employees' => $employees->map(fn ($e) => [
                'employee_number' => $e->employee_number,
                'name' => $e->fullName(),
                'kra_pin' => $e->kra_pin,
                'annual_gross' => $e->payslips->sum('gross_pay'),
                'annual_paye' => $e->payslips->sum('paye'),
                'annual_nhif' => $e->payslips->sum('nhif'),
                'annual_nssf' => $e->payslips->sum('nssf_employee'),
                'annual_housing_levy' => $e->payslips->sum('housing_levy'),
                'annual_net' => $e->payslips->sum('net_pay'),
            ]),
        ]);
    }
}
