<?php

// ─────────────────────────────────────────────────────────────────────────────
// FILE: app/Models/ChartOfAccount.php
// ─────────────────────────────────────────────────────────────────────────────

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChartOfAccount extends Model
{
    use SoftDeletes;

    protected $table = 'chart_of_accounts';

    protected $fillable = [
        'code', 'name', 'description', 'type', 'sub_type',
        'parent_id', 'normal_balance', 'is_foreign_currency', 'currency_code',
        'is_bank_account', 'is_cash_account', 'is_ar_account',
        'is_ap_account', 'is_tax_account', 'is_retained_earnings',
        'is_active', 'is_system', 'sort_order',
    ];

    protected $casts = [
        'is_foreign_currency' => 'boolean',
        'is_bank_account' => 'boolean',
        'is_cash_account' => 'boolean',
        'is_ar_account' => 'boolean',
        'is_ap_account' => 'boolean',
        'is_tax_account' => 'boolean',
        'is_retained_earnings' => 'boolean',
        'is_active' => 'boolean',
        'is_system' => 'boolean',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class, 'parent_id');
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'account_id');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Calculate the account balance for a given period or up to a given date.
     * Returns positive = normal balance direction.
     */
    public function balance(?Carbon $asOf = null, ?int $periodId = null): float
    {
        $query = $this->journalLines()
            ->whereHas('journalEntry', function ($q) use ($asOf, $periodId) {
                $q->where('status', 'posted');
                if ($asOf) {
                    $q->whereDate('entry_date', '<=', $asOf);
                }
                if ($periodId) {
                    $q->where('period_id', $periodId);
                }
            });

        $debits = (float) (clone $query)->where('type', 'debit')->sum('amount');
        $credits = (float) (clone $query)->where('type', 'credit')->sum('amount');

        return $this->normal_balance === 'debit'
            ? $debits - $credits
            : $credits - $debits;
    }

    public function isDebitNormal(): bool
    {
        return $this->normal_balance === 'debit';
    }

    public function isCreditNormal(): bool
    {
        return $this->normal_balance === 'credit';
    }

    /** Is this account on the Balance Sheet? */
    public function isBalanceSheet(): bool
    {
        return in_array($this->type, ['asset', 'liability', 'equity']);
    }

    /** Is this account on the P&L? */
    public function isProfitAndLoss(): bool
    {
        return in_array($this->type, ['revenue', 'expense', 'cogs', 'other_income', 'other_expense']);
    }

    public static function getAR(): ?self
    {
        return static::where('is_ar_account', true)->where('is_system', true)->first();
    }

    public static function getRetainedEarnings(): ?self
    {
        return static::where('is_retained_earnings', true)->first();
    }
}
