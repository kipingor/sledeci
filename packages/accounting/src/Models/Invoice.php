<?php

namespace Sledeci\Accounting\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Canonical Invoice model for the Accounting package.
 *
 * Related host models (User, Project) are resolved from config/accounting.php
 * so the package does not hard-depend on App\Models.
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

        // Accounting / posting fields
        'journal_entry_id',
        'posting_status',       // 'unposted' | 'posted' | 'reversed'
        'exchange_rate',
        'functional_currency',
        'functional_total',
    ];

    protected $casts = [
        'lines'            => 'array',
        'subtotal'         => 'decimal:2',
        'tax'              => 'decimal:2',
        'total'            => 'decimal:2',
        'functional_total' => 'decimal:4',
        'exchange_rate'    => 'decimal:10',
        'issue_date'       => 'date',
        'due_date'         => 'date',
        'sent_at'          => 'datetime',
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
                $year  = now()->year;
                $count = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $invoice->number = sprintf('INV-%d-%04d', $year, $count);
            }
        });
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(config('accounting.client_model'), 'client_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(config('accounting.project_model'));
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    /**
     * Factories stay in the host application's database/factories.
     */
    protected static function newFactory(): \Database\Factories\InvoiceFactory
    {
        return \Database\Factories\InvoiceFactory::new();
    }
}
