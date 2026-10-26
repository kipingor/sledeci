<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * BUG FIX: The original ExchangeRate.php had TWO class definitions in the same file:
 *   class ExchangeRate extends Model { ... }
 *   class TaxCode extends Model { ... }   ← should never be here
 *
 * Because TaxCode.php also exists as a standalone file, PHP throws:
 *   "Cannot declare class App\Models\TaxCode, because the name is already in use"
 * when both files are autoloaded (which happens on any request that touches accounting).
 *
 * Fix: remove the inline TaxCode class. It lives exclusively in app/Models/TaxCode.php.
 */
class ExchangeRate extends Model
{
    protected $fillable = [
        'from_currency',
        'to_currency',
        'rate',
        'rate_type',
        'rate_date',
        'source',
        'entered_by',
    ];

    protected $casts = [
        'rate' => 'decimal:10',
        'rate_date' => 'date',
    ];

    // ── Relations ──────────────────────────────────────────────────────────────

    public function enteredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    // ── Static helpers (used by PostingEngine) ────────────────────────────────

    /**
     * Get the spot rate for a currency pair on or before a given date.
     * Falls back to the most recent rate if no exact match exists.
     *
     * Called by PostingEngine::resolveFX():
     *   ExchangeRate::getRate('USD', 'KES', Carbon::today())
     *   // returns e.g. 129.50
     */
    public static function getRate(
        string $from,
        string $to,
        Carbon $date,
        string $type = 'spot'
    ): ?float {
        if ($from === $to) {
            return 1.0;
        }

        $rate = static::where('from_currency', strtoupper($from))
            ->where('to_currency', strtoupper($to))
            ->where('rate_type', $type)
            ->where('rate_date', '<=', $date->toDateString())
            ->orderByDesc('rate_date')
            ->value('rate');

        return $rate ? (float) $rate : null;
    }

    /**
     * Convert an amount from one currency to another.
     * Returns null if no rate is available for the date.
     */
    public static function convert(
        float $amount,
        string $from,
        string $to,
        Carbon $date
    ): ?float {
        if ($from === $to) {
            return $amount;
        }

        $rate = static::getRate($from, $to, $date);

        return $rate ? round($amount * $rate, 4) : null;
    }
}
