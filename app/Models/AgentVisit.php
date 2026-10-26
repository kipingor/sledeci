<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AgentVisit extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'field_agent_id', 'client_id', 'lead_id',
        'latitude', 'longitude', 'location_name',
        'checked_in_at', 'checked_out_at',
        'purpose', 'outcome',
        'amount_collected', 'collection_reference',
        'order_items', 'order_total',
        'notes', 'signature_path',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
        'amount_collected' => 'decimal:2',
        'order_total' => 'decimal:2',
        'order_items' => 'array',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(FieldAgent::class, 'field_agent_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function durationMinutes(): ?int
    {
        if (! $this->checked_in_at || ! $this->checked_out_at) {
            return null;
        }

        return (int) $this->checked_in_at->diffInMinutes($this->checked_out_at);
    }
}
