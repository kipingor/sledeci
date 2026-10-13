<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AutomationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'automation_rule_id',
        'triggerable_type',
        'triggerable_id',
        'status',
        'payload',
        'result',
        'error_message',
        'executed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'result' => 'array',
        'executed_at' => 'datetime',
    ];

    /**
     * Get the automation rule.
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(AutomationRule::class, 'automation_rule_id');
    }

    /**
     * Get the triggerable model (Lead, Opportunity, etc).
     */
    public function triggerable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope to get successful executions.
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope to get failed executions.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope to get recent logs.
     */
    public function scopeRecent($query, int $limit = 50)
    {
        return $query->latest('executed_at')->limit($limit);
    }
}
