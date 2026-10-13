<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Issue Log entry — PMBOK §4.3.3
 *
 * Issues are problems that have materialised (as distinct from risks,
 * which are uncertain future events). The Issue Log is updated throughout
 * project execution and is an input to several monitoring processes.
 */
class ProjectIssue extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'project_issues';

    public const SEVERITIES = ['low', 'medium', 'high', 'critical'];
    public const PRIORITIES  = ['low', 'medium', 'high', 'urgent'];
    public const STATUSES    = ['open', 'in_progress', 'escalated', 'resolved', 'closed'];

    protected $fillable = [
        'project_id', 'owner_id', 'raised_by', 'risk_id',
        'title', 'description', 'category',
        'severity', 'priority', 'status',
        'resolution', 'raised_date', 'target_resolution_date', 'resolved_date',
        'impact_description', 'notes',
    ];

    protected $casts = [
        'raised_date'             => 'date',
        'target_resolution_date'  => 'date',
        'resolved_date'           => 'date',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function raisedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'raised_by');
    }

    /**
     * The risk that materialised into this issue, if any.
     */
    public function risk(): BelongsTo
    {
        return $this->belongsTo(ProjectRisk::class, 'risk_id');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getIsOverdueAttribute(): bool
    {
        return $this->target_resolution_date
            && now()->isAfter($this->target_resolution_date)
            && ! in_array($this->status, ['resolved', 'closed']);
    }

    public function getDaysOpenAttribute(): int
    {
        $start = $this->raised_date ?? $this->created_at;
        $end   = $this->resolved_date ?? now();
        return (int) $start->diffInDays($end);
    }
}
