<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// ─────────────────────────────────────────────────────────────────────────────
// AccountingPeriod
// ─────────────────────────────────────────────────────────────────────────────
class AccountingPeriod extends Model
{
    protected $fillable = [
        'name', 'type', 'fiscal_year', 'period_number',
        'starts_on', 'ends_on', 'status',
        'closed_at', 'closed_by', 'is_adjustment_period',
    ];
    protected $casts = [
        'starts_on'            => 'date',
        'ends_on'              => 'date',
        'closed_at'            => 'datetime',
        'is_adjustment_period' => 'boolean',
    ];
    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class, 'period_id');
    }
    public function isOpen(): bool   { return $this->status === 'open'; }
    public function isClosed(): bool { return in_array($this->status, ['closed', 'locked']); }
    public function isLocked(): bool { return $this->status === 'locked'; }

    /** Get or create the period for a given date. */
    public static function forDate(\Carbon\Carbon $date): ?self
    {
        return static::where('starts_on', '<=', $date->toDateString())
            ->where('ends_on', '>=', $date->toDateString())
            ->where('type', 'month')
            ->first();
    }

    /** Create monthly periods for a fiscal year. */
    public static function createFiscalYear(int $year, int $startMonth = 1): void
    {
        for ($m = 0; $m < 12; $m++) {
            $start = \Carbon\Carbon::create($year, $startMonth, 1)->addMonths($m)->startOfMonth();
            $end   = $start->copy()->endOfMonth();
            $fy    = $start->month >= $startMonth ? $year : $year + 1;

            static::firstOrCreate(
                ['fiscal_year' => $fy, 'period_number' => $m + 1, 'type' => 'month'],
                [
                    'name'       => $start->format('M Y'),
                    'starts_on'  => $start,
                    'ends_on'    => $end,
                    'status'     => 'open',
                ]
            );
        }
    }
}
