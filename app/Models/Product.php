<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    /** Supported currencies — shared constant with Lead */
    public const CURRENCIES = [
        'KES' => 'KES — Kenyan Shilling',
        'USD' => 'USD — US Dollar',
        'EUR' => 'EUR — Euro',
        'GBP' => 'GBP — British Pound',
        'UGX' => 'UGX — Ugandan Shilling',
        'TZS' => 'TZS — Tanzanian Shilling',
        'ZAR' => 'ZAR — South African Rand',
        'NGN' => 'NGN — Nigerian Naira',
        'AED' => 'AED — UAE Dirham',
        'CNY' => 'CNY — Chinese Yuan',
    ];

    protected $fillable = [
        'supplier_id', 'name', 'sku', 'barcode', 'description',
        'category', 'unit', 'unit_cost', 'unit_price', 'currency',
        'stock_qty', 'reorder_point', 'reorder_qty', 'location',
        'active', 'metadata',
    ];

    protected $casts = [
        'unit_cost'     => 'decimal:2',
        'unit_price'    => 'decimal:2',
        'stock_qty'     => 'integer',
        'reorder_point' => 'integer',
        'reorder_qty'   => 'integer',
        'active'        => 'boolean',
        'metadata'      => 'array',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    // ── Inventory helpers ──────────────────────────────────────────────────

    /**
     * Core method: record a stock movement and update stock_qty atomically.
     *
     * @param  int    $quantity   Signed delta (+in, -out)
     * @param  string $type       StockMovement type enum value
     * @param  string|null $reference  PO number, invoice number, etc.
     * @param  Model|null  $source     Polymorphic source (Delivery, Invoice…)
     * @param  string|null $notes
     */
    public function adjustStock(
        int    $quantity,
        string $type,
        ?string $reference = null,
        ?Model  $source    = null,
        ?string $notes     = null,
    ): StockMovement {
        // Atomic increment / decrement
        $this->increment('stock_qty', $quantity);
        $this->refresh();

        $movement = StockMovement::create([
            'product_id'     => $this->id,
            'created_by'     => Auth::id(),
            'source_type'    => $source ? get_class($source) : null,
            'source_id'      => $source?->id,
            'type'           => $type,
            'quantity'       => $quantity,
            'quantity_after' => $this->stock_qty,
            'reference'      => $reference,
            'unit_cost'      => $this->unit_cost,
            'notes'          => $notes,
        ]);

        return $movement;
    }

    public function isLowStock(): bool
    {
        return $this->reorder_point > 0 && $this->stock_qty <= $this->reorder_point;
    }

    public function isCriticalStock(): bool
    {
        return $this->reorder_point > 0 && $this->stock_qty <= (int) ($this->reorder_point / 2);
    }

    public function marginPct(): int
    {
        if ((float) $this->unit_cost <= 0) return 0;
        return (int) round(($this->unit_price - $this->unit_cost) / $this->unit_cost * 100);
    }

    public function stockValue(): float
    {
        return round((float) $this->unit_cost * $this->stock_qty, 2);
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    public function scopeLowStock($query)
    {
        return $query->whereRaw('reorder_point > 0 AND stock_qty <= reorder_point');
    }

    public function scopeOutOfStock($query)
    {
        return $query->where('stock_qty', '<=', 0)->where('active', true);
    }

    public function scopeByBarcode($query, string $barcode)
    {
        return $query->where('barcode', $barcode)->orWhere('sku', $barcode);
    }
}
