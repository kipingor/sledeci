<?php

namespace Sledeci\KenyaPayroll\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    protected $fillable = [
        'created_by', 'year', 'month', 'reference', 'status',
        'total_gross', 'total_paye', 'total_nhif', 'total_nssf',
        'total_housing_levy', 'total_net', 'total_employer_nssf',
        'payment_date', 'notes',
    ];

    protected $casts = [
        'payment_date'       => 'date',
        'total_gross'        => 'decimal:2',
        'total_paye'         => 'decimal:2',
        'total_nhif'         => 'decimal:2',
        'total_nssf'         => 'decimal:2',
        'total_housing_levy' => 'decimal:2',
        'total_net'          => 'decimal:2',
        'total_employer_nssf'=> 'decimal:2',
    ];

    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function payslips(): HasMany  { return $this->hasMany(Payslip::class); }

    public function periodLabel(): string
    {
        return date('F Y', mktime(0, 0, 0, $this->month, 1, $this->year));
    }

    public function isEditable(): bool
    {
        return $this->status === 'draft';
    }

    /** Payslips may be (re)computed until the run is approved — e.g. after fixing a salary. */
    public function canCompute(): bool
    {
        return in_array($this->status, ['draft', 'processing'], true);
    }
}
