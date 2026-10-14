<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaccoLoan extends Model
{
    use SoftDeletes;
 
    protected $fillable = [
        'sacco_member_id', 'loan_number', 'principal', 'interest_rate',
        'term_months', 'monthly_repayment', 'total_repayable', 'outstanding_balance',
        'status', 'applied_date', 'approved_date', 'disbursed_date', 'expected_end_date',
        'approved_by', 'purpose', 'repayment_schedule',
    ];
 
    protected $casts = [
        'principal'           => 'decimal:2',
        'interest_rate'       => 'decimal:2',
        'monthly_repayment'   => 'decimal:2',
        'total_repayable'     => 'decimal:2',
        'outstanding_balance' => 'decimal:2',
        'applied_date'        => 'date',
        'approved_date'       => 'date',
        'disbursed_date'      => 'date',
        'expected_end_date'   => 'date',
        'repayment_schedule'  => 'array',
    ];
 
    public function member(): BelongsTo   { return $this->belongsTo(SaccoMember::class); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
 
    /**
     * Compute the monthly repayment using reducing-balance formula:
     * M = P * r(1+r)^n / ((1+r)^n - 1)
     */
    public static function computeMonthlyRepayment(float $principal, float $annualRate, int $months): float
    {
        $r = ($annualRate / 100) / 12;
        if ($r == 0) return round($principal / $months, 2);
        $m = $principal * ($r * pow(1 + $r, $months)) / (pow(1 + $r, $months) - 1);
        return round($m, 2);
    }
 
    /**
     * Generate a full amortisation schedule.
     */
    public static function buildRepaymentSchedule(float $principal, float $annualRate, int $months, string $startDate): array
    {
        $r          = ($annualRate / 100) / 12;
        $monthly    = static::computeMonthlyRepayment($principal, $annualRate, $months);
        $balance    = $principal;
        $schedule   = [];
        $date       = \Carbon\Carbon::parse($startDate);
 
        for ($i = 1; $i <= $months; $i++) {
            $interest   = round($balance * $r, 2);
            $principal_ = round($monthly - $interest, 2);
            $balance    = max(0, round($balance - $principal_, 2));
 
            $schedule[] = [
                'installment' => $i,
                'date'        => $date->copy()->addMonths($i)->toDateString(),
                'principal'   => $principal_,
                'interest'    => $interest,
                'payment'     => $monthly,
                'balance'     => $balance,
            ];
        }
 
        return $schedule;
    }
}
