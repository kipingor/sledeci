<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSaleItem extends Model
{
    protected $fillable = [
        'pos_sale_id', 'product_id', 'product_name',
        'quantity', 'unit_price', 'discount', 'line_total',
    ];

    protected $casts = [
        'quantity'   => 'integer',
        'unit_price' => 'decimal:2',
        'discount'   => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function sale(): BelongsTo    { return $this->belongsTo(PosSale::class, 'pos_sale_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}
