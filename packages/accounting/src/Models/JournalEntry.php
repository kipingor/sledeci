<?php

namespace Sledeci\Accounting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * BUG FIX: The original file had a second class (JournalEntryLine) appended
 * after the closing brace of JournalEntry. That inline class conflicted with
 * the autoloaded JournalEntryLine.php (which was empty). Both are now clean.
 * The JournalEntryLine class lives exclusively in app/Models/JournalEntryLine.php.
 */
class JournalEntry extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reference', 'period_id', 'entry_date', 'posting_date',
        'type', 'memo', 'notes', 'functional_currency',
        'source_type', 'source_id',
        'reversed_by', 'is_reversal', 'is_reversed',
        'status', 'created_by', 'posted_by', 'posted_at',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'posting_date' => 'date',
        'posted_at' => 'datetime',
        'is_reversal' => 'boolean',
        'is_reversed' => 'boolean',
    ];

    // ── Booted: auto-generate reference ──────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (JournalEntry $je) {
            if (empty($je->reference)) {
                $year = now()->year;
                $seq = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $je->reference = sprintf('JE-%d-%05d', $year, $seq);
            }
        });
    }

    // ── Relations ─────────────────────────────────────────────────────────────

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class)->orderBy('line_order');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AccountingPeriod::class, 'period_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function reversedEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'reversed_by');
    }

    /** Polymorphic source document (Invoice, Payment, Expense). */
    public function source()
    {
        return $this->morphTo();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isPosted(): bool
    {
        return $this->status === 'posted';
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function totalDebits(): float
    {
        return (float) $this->lines()->where('type', 'debit')->sum('amount');
    }

    public function totalCredits(): float
    {
        return (float) $this->lines()->where('type', 'credit')->sum('amount');
    }

    public function isBalanced(): bool
    {
        return abs($this->totalDebits() - $this->totalCredits()) < 0.005;
    }

    public function validate(): array
    {
        $errors = [];

        if ($this->lines()->count() < 2) {
            $errors[] = 'A journal entry must have at least two lines.';
        }

        if (! $this->isBalanced()) {
            $errors[] = sprintf(
                'Entry is not balanced: debits %.2f ≠ credits %.2f.',
                $this->totalDebits(),
                $this->totalCredits()
            );
        }

        if (! $this->period_id) {
            $errors[] = 'No accounting period assigned.';
        } elseif ($this->period->isClosed()) {
            $errors[] = "Period '{$this->period->name}' is closed.";
        }

        return $errors;
    }
}
