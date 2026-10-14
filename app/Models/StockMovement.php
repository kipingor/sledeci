<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    protected $fillable = [
        'product_id', 'created_by',
        'source_type', 'source_id',
        'type', 'quantity', 'quantity_after',
        'reference', 'unit_cost', 'notes',
    ];

    protected $casts = [
        'quantity'       => 'integer',
        'quantity_after' => 'integer',
        'unit_cost'      => 'decimal:4',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isInbound(): bool
    {
        return $this->quantity > 0;
    }

    public function typeLabel(): string
    {
        return match ($this->type) {
            'receipt'      => 'Goods Received',
            'sale'         => 'Sale',
            'adjustment'   => 'Stock Adjustment',
            'return_in'    => 'Client Return',
            'return_out'   => 'Supplier Return',
            'write_off'    => 'Write-Off',
            'transfer_in'  => 'Transfer In',
            'transfer_out' => 'Transfer Out',
            default        => ucfirst($this->type),
        };
    }
}
