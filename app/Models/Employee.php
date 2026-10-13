<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'user_id', 'employee_number', 'first_name', 'last_name',
        'email', 'phone', 'id_number', 'kra_pin', 'nssf_number', 'nhif_number',
        'employment_type', 'department', 'job_title', 'hire_date', 'termination_date',
        'active', 'basic_salary', 'house_allowance', 'transport_allowance',
        'other_allowances', 'currency', 'pay_frequency',
        'bank_name', 'bank_account_number', 'bank_branch', 'mpesa_phone',
        'helb_deduction', 'metadata',
    ];

    protected $casts = [
        'hire_date'         => 'date',
        'termination_date'  => 'date',
        'active'            => 'boolean',
        'basic_salary'      => 'decimal:2',
        'house_allowance'   => 'decimal:2',
        'transport_allowance'=> 'decimal:2',
        'other_allowances'  => 'decimal:2',
        'helb_deduction'    => 'decimal:2',
        'metadata'          => 'array',
    ];

    public function user(): BelongsTo     { return $this->belongsTo(User::class); }
    public function payslips(): HasMany   { return $this->hasMany(Payslip::class); }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function grossPay(): float
    {
        return round(
            (float)$this->basic_salary + (float)$this->house_allowance +
            (float)$this->transport_allowance + (float)$this->other_allowances,
            2
        );
    }
}
