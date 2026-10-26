<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosSale extends Model
{
    protected $fillable = [
        'receipt_number', 'cashier_id', 'client_id', 'walk_in_name', 'walk_in_phone',
        'subtotal', 'tax', 'discount', 'total', 'currency',
        'payment_channel', 'mobile_money_code', 'amount_tendered', 'change_given',
        'status', 'void_reason',
        'etims_invoice_number', 'etims_status',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_tendered' => 'decimal:2',
        'change_given' => 'decimal:2',
    ];

    public static function generateReceiptNumber(): string
    {
        $prefix = 'POS-'.now()->format('Ymd');
        $last = static::where('receipt_number', 'like', "{$prefix}%")
            ->orderByDesc('id')->first();
        $seq = $last ? ((int) substr($last->receipt_number, -4)) + 1 : 1;

        return $prefix.'-'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PosSaleItem::class);
    }
}
