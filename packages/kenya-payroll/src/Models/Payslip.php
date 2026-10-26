<?php

namespace Sledeci\KenyaPayroll\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payslip extends Model
{
    protected $fillable = [
        'payroll_run_id', 'employee_id',
        'basic_salary', 'house_allowance', 'transport_allowance', 'other_allowances',
        'gross_pay', 'paye', 'nhif', 'nssf_employee', 'nssf_employer',
        'housing_levy', 'helb', 'other_deductions', 'total_deductions', 'net_pay',
        'payment_status', 'payment_reference', 'paid_at',
    ];

    protected $casts = [
        'basic_salary'       => 'decimal:2',
        'house_allowance'    => 'decimal:2',
        'transport_allowance'=> 'decimal:2',
        'other_allowances'   => 'decimal:2',
        'gross_pay'          => 'decimal:2',
        'paye'               => 'decimal:2',
        'nhif'               => 'decimal:2',
        'nssf_employee'      => 'decimal:2',
        'nssf_employer'      => 'decimal:2',
        'housing_levy'       => 'decimal:2',
        'helb'               => 'decimal:2',
        'other_deductions'   => 'decimal:2',
        'total_deductions'   => 'decimal:2',
        'net_pay'            => 'decimal:2',
        'paid_at'            => 'datetime',
    ];

    public function run(): BelongsTo        { return $this->belongsTo(PayrollRun::class, 'payroll_run_id'); }
    public function employee(): BelongsTo   { return $this->belongsTo(Employee::class); }
    public function deductions(): HasMany   { return $this->hasMany(PayslipDeduction::class); }
}


// ── PayslipDeduction ───────────────────────────────────────────────────────────

class PayslipDeduction extends Model
{
    protected $fillable = ['payslip_id', 'name', 'type', 'amount', 'notes'];
    protected $casts    = ['amount' => 'decimal:2'];

    public function payslip(): BelongsTo { return $this->belongsTo(Payslip::class); }
}
