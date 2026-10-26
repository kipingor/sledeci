<?php

namespace Sledeci\Accounting\Models;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * BUG FIX: The standalone JournalEntryLine.php was empty (just "//").
 * The real class definition with fillable, casts, and relations was incorrectly
 * placed INLINE at the bottom of JournalEntry.php — a second class in the same file.
 *
 * PHP's autoloader loads JournalEntryLine.php first (matching the class name).
 * Because that file was empty, all PostingEngine calls to:
 *   JournalEntryLine::insert([...])
 *   JournalEntryLine::create([...])
 * worked at the DB level (raw inserts), but loading the model back via relations
 * returned bare instances with no casts, no fillable, and broken relations.
 *
 * Fix: move the full class definition here and remove the inline copy from JournalEntry.php.
 */
class JournalEntryLine extends Model
{
    protected $fillable = [
        'journal_entry_id',
        'account_id',
        'type',           // 'debit' | 'credit'
        'amount',
        'foreign_currency',
        'foreign_amount',
        'exchange_rate',
        'tax_code_id',
        'tax_amount',
        'description',
        'project_id',
        'client_id',
        'line_order',
    ];

    protected $casts = [
        'amount'         => 'decimal:4',
        'foreign_amount' => 'decimal:4',
        'exchange_rate'  => 'decimal:10',
        'tax_amount'     => 'decimal:4',
    ];

    // ── Relations ──────────────────────────────────────────────────────────────

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    public function taxCode(): BelongsTo
    {
        return $this->belongsTo(TaxCode::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function isDebit(): bool
    {
        return $this->type === 'debit';
    }
    public function isCredit(): bool
    {
        return $this->type === 'credit';
    }
}
