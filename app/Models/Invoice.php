<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * BUG FIX: $fillable was missing the five accounting columns added by the
 * create_accounting_tables migration. PostingEngine::postInvoice() calls:
 *
 *   $invoice->update([
 *       'journal_entry_id'   => $je->id,     ← silently dropped
 *       'posting_status'     => 'posted',     ← silently dropped
 *       'exchange_rate'      => $rate,        ← silently dropped
 *       'functional_currency'=> 'KES',        ← silently dropped
 *       'functional_total'   => $total,       ← silently dropped
 *   ]);
 *
 * Because Eloquent ignores mass-assigned fields not in $fillable, the invoice
 * was never marked as posted → postPending() would re-post the same invoices
 * on every run, creating duplicate journal entries.
 *
 * Also: Payment model used 'payment_method' but the migration column is 'method'.
 * That is fixed in the companion Payment.php file.
 */
class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        // Core invoice fields
        'project_id',
        'client_id',
        'number',
        'status',
        'currency',
        'issue_date',
        'due_date',
        'sent_at',
        'subtotal',
        'tax',
        'total',
        'lines',
        'notes',

        // Accounting / posting fields (from create_accounting_tables migration)
        'journal_entry_id',
        'posting_status',       // 'unposted' | 'posted' | 'reversed'
        'exchange_rate',
        'functional_currency',
        'functional_total',
    ];

    protected $casts = [
        'lines' => 'array',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'functional_total' => 'decimal:4',
        'exchange_rate' => 'decimal:10',
        'issue_date' => 'date',
        'due_date' => 'date',
        'sent_at' => 'datetime',
    ];

    // ── Status helpers ─────────────────────────────────────────────────────────

    public function isOverdue(): bool
    {
        return $this->status !== 'paid'
            && $this->status !== 'cancelled'
            && $this->due_date
            && $this->due_date->isPast();
    }

    public function amountPaid(): float
    {
        return (float) $this->payments()->sum('amount');
    }

    public function amountDue(): float
    {
        return max(0, (float) $this->total - $this->amountPaid());
    }

    public function isPosted(): bool
    {
        return $this->posting_status === 'posted';
    }

    // ── Auto-generate invoice number ───────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            if (empty($invoice->number)) {
                $year = now()->year;
                $count = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $invoice->number = sprintf('INV-%d-%04d', $year, $count);
            }
        });
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(ClientFollowUp::class);
    }
}
