<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Sledeci\Accounting\Models\Invoice;

class MobileMoneyRequest extends Model
{
    protected $fillable = [
        'invoice_id', 'channel', 'external_id', 'merchant_request_id',
        'phone', 'amount', 'status', 'payload', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payload' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
