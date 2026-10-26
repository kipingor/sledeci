<?php

namespace App\Models;

use App\Enums\ActivityType;
use App\Policies\ActivityPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[UsePolicy(ActivityPolicy::class)]
class Activity extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'lead_id',
        'user_id',
        'type',
        'subject',
        'description',
        'scheduled_at',
        'completed_at',
        'duration',
        'outcome',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
        'metadata' => 'array',
        'type' => ActivityType::class,
    ];

    /**
     * Get the lead that owns the activity.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Get the user who created the activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to get only completed activities.
     */
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Scope to get only pending activities.
     */
    public function scopePending($query)
    {
        return $query->whereNull('completed_at');
    }

    /**
     * Scope to get only scheduled activities.
     */
    public function scopeScheduled($query)
    {
        return $query->whereNotNull('scheduled_at');
    }

    /**
     * Scope to get activities by type.
     */
    public function scopeOfType($query, string|ActivityType $type)
    {
        if ($type instanceof ActivityType) {
            $type = $type->value;
        }

        return $query->where('type', $type);
    }

    /**
     * Scope to get overdue activities.
     */
    public function scopeOverdue($query)
    {
        return $query->whereNull('completed_at')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<', now());
    }

    /**
     * Scope to get upcoming activities.
     */
    public function scopeUpcoming($query, int $days = 7)
    {
        return $query->whereNull('completed_at')
            ->whereNotNull('scheduled_at')
            ->whereBetween('scheduled_at', [now(), now()->addDays($days)])
            ->orderBy('scheduled_at');
    }

    /**
     * Check if activity is completed.
     */
    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * Check if activity is overdue.
     */
    public function isOverdue(): bool
    {
        return $this->scheduled_at
            && $this->scheduled_at->isPast()
            && ! $this->isCompleted();
    }

    /**
     * Mark activity as completed.
     */
    public function markAsCompleted(?string $outcome = null): self
    {
        $this->update([
            'completed_at' => now(),
            'outcome' => $outcome ?? $this->outcome,
        ]);

        return $this;
    }

    /**
     * Get formatted duration.
     */
    public function getFormattedDurationAttribute(): ?string
    {
        return $this->duration;
    }
}
