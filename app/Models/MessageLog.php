<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MessageLog extends Model
{
    protected $fillable = [
        'messageable_type', 'messageable_id',
        'sent_by', 'channel', 'to_phone', 'to_email', 'to_name',
        'template', 'body', 'status',
        'provider_message_id', 'provider_error', 'cost',
        'sent_at', 'delivered_at', 'read_at',
    ];

    protected $casts = [
        'cost' => 'decimal:6',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function messageable(): MorphTo
    {
        return $this->morphTo();
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function isDelivered(): bool
    {
        return in_array($this->status, ['delivered', 'read']);
    }
}
