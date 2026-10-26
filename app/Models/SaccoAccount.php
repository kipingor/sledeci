<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaccoAccount extends Model
{
    protected $fillable = ['sacco_member_id', 'type', 'balance', 'currency', 'active'];

    protected $casts = ['balance' => 'decimal:2', 'active' => 'boolean'];

    public function member(): BelongsTo
    {
        return $this->belongsTo(SaccoMember::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SaccoTransaction::class);
    }

    /**
     * Apply a signed delta to the balance and record the transaction.
     */
    public function applyTransaction(float $amount, string $type, ?string $reference = null, ?string $notes = null, ?int $createdBy = null): SaccoTransaction
    {
        $this->increment('balance', $amount);
        $this->refresh();

        return SaccoTransaction::create([
            'sacco_account_id' => $this->id,
            'created_by' => $createdBy ?? auth()->id(),
            'type' => $type,
            'amount' => $amount,
            'balance_after' => $this->balance,
            'reference' => $reference,
            'notes' => $notes,
            'transacted_at' => now(),
        ]);
    }
}
