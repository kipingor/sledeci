<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * BUG FIX 1 — $fillable was missing all accounting columns.
 * PostingEngine::postPayment() calls:
 *
 *   $payment->update([
 *       'journal_entry_id' => $je->id,    ← silently dropped
 *       'posting_status'   => 'posted',   ← silently dropped
 *       'exchange_rate'    => $rate,       ← silently dropped
 *   ]);
 *
 * This meant payments were never marked as posted, causing duplicate journal
 * entries every time postPending() was called.
 *
 * BUG FIX 2 — Column name mismatch.
 * The migration creates the column as `method` (matching the factory and
 * PostingEngine). The original model had `payment_method` in $fillable.
 * Seeded payment data was stored correctly via the factory's direct insert,
 * but any subsequent Payment::create(['method' => ...]) call would silently
 * store NULL in the `method` column because 'method' was not in $fillable.
 *
 * BUG FIX 3 — Missing columns: project_id, received_by, bank_account_id.
 * The migration declares all three; they were absent from $fillable.
 * PostingEngine reads bank_account_id to determine which bank account to
 * debit — without it in fillable it can never be set via mass assignment.
 */
class Payment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        // Core payment fields (matching the migration column names exactly)
        'invoice_id',
        'project_id',
        'amount',
        'currency',
        'method',           // ← was 'payment_method' — migration column is 'method'
        'channel',          // cash|bank|mpesa|airtel_money|mtn_momo|card|cheque|crypto|other (dashboards filter on this)
        'reference',
        'notes',
        'paid_at',
        'received_by',

        // Mobile money fields
        'mobile_money_code',
        'mobile_money_phone',
        'mobile_money_payload',
        'reconciliation_status',

        // Accounting / posting fields (from create_accounting_tables migration)
        'journal_entry_id',
        'posting_status',   // 'unposted' | 'posted' | 'reversed'
        'exchange_rate',
        'functional_amount',
        'bank_account_id',  // FK → chart_of_accounts; used by PostingEngine
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'exchange_rate'=> 'decimal:10',
        'functional_amount'     => 'decimal:4',
        'mobile_money_payload'  => 'array',
        'paid_at'      => 'datetime',
    ];

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function isPosted(): bool
    {
        return $this->posting_status === 'posted';
    }

    public function isMobileMoney(): bool
    {
        return in_array($this->channel, ['mpesa', 'airtel_money', 'mtn_momo']);
    }

    public function isReconciled(): bool
    {
        return $this->reconciliation_status === 'matched';
    }

    public function channelLabel(): string
    {
        return match ($this->channel) {
            'mpesa'        => 'M-Pesa',
            'airtel_money' => 'Airtel Money',
            'mtn_momo'     => 'MTN MoMo',
            'bank'         => 'Bank Transfer',
            'cash'         => 'Cash',
            'card'         => 'Card',
            'cheque'       => 'Cheque',
            'crypto'       => 'Crypto',
            default        => ucfirst($this->channel ?? $this->method),
        };
    }

    // ── Relations ──────────────────────────────────────────────────────────────

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'bank_account_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function messageLogs(): HasMany
    {
        return $this->hasMany(MessageLog::class, 'messageable_id')
            ->where('messageable_type', self::class);
    }
}
