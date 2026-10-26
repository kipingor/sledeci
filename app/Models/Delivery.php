<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Delivery extends Model
{
    use SoftDeletes;

    protected $fillable = ['purchase_order_id', 'client_id', 'received_by', 'number', 'status', 'carrier', 'tracking_number', 'tracking_url', 'expected_date', 'delivered_date', 'items', 'delivery_notes', 'signed_by', 'signature_path', 'signed_at', 'client_notes'];

    protected $casts = ['items' => 'array', 'expected_date' => 'date', 'delivered_date' => 'date', 'signed_at' => 'datetime'];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(DeliveryDocument::class);
    }
}
