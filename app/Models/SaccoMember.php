<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaccoMember extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'member_number', 'joined_date',
        'share_capital', 'monthly_contribution', 'status', 'notes',
    ];

    protected $casts = [
        'joined_date' => 'date',
        'share_capital' => 'decimal:2',
        'monthly_contribution' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(SaccoAccount::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(SaccoLoan::class);
    }

    public function savingsAccount(): HasOne
    {
        return $this->hasOne(SaccoAccount::class)->where('type', 'savings');
    }

    public function savingsBalance(): float
    {
        return (float) $this->savingsAccount?->balance ?? 0;
    }

    public function totalLoanOutstanding(): float
    {
        return (float) $this->loans()
            ->whereIn('status', ['disbursed', 'repaying'])
            ->sum('outstanding_balance');
    }

    /**
     * Maximum loan a member can take based on 3× savings rule.
     */
    public function loanLimit(): float
    {
        return round($this->savingsBalance() * 3, 2);
    }
}
