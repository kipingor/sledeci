<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Auth;

/**
 * Canonical audit log model.
 *
 * FIX: Previously two models (ActivityLog + AuditLog) both pointed to this
 * same `audit_logs` table. ActivityLog has been deleted — use this class
 * everywhere, including in ProjectController::show().
 */
class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';

    protected $fillable = [
        'auditable_type',
        'auditable_id',
        'user_id',
        'event',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForModel(Builder $query, string $type, int $id): Builder
    {
        return $query->where('auditable_type', $type)->where('auditable_id', $id);
    }

    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeEvent(Builder $query, string $event): Builder
    {
        return $query->where('event', $event);
    }

    public function scopeRecent(Builder $query, int $days = 30): Builder
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Return a human-readable summary of what changed.
     */
    public function getChangeSummaryAttribute(): string
    {
        if (empty($this->new_values)) {
            return ucfirst($this->event).' '.class_basename($this->auditable_type);
        }

        $changed = array_keys($this->new_values);

        return ucfirst($this->event).' — changed: '.implode(', ', $changed);
    }

    /**
     * Log a model event to the audit table.
     */
    public static function record(
        Model $auditable,
        string $event,
        array $oldValues = [],
        array $newValues = [],
        ?int $userId = null,
    ): self {
        return static::create([
            'auditable_type' => get_class($auditable),
            'auditable_id' => $auditable->getKey(),
            'user_id' => $userId ?? Auth::id(),
            'event' => $event,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
