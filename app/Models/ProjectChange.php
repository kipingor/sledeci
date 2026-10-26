<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Change Request — PMBOK §4.6 (Perform Integrated Change Control)
 *
 * Every change to scope, schedule, or cost baselines must be formally
 * submitted, reviewed by the CCB (Change Control Board), and either
 * approved or rejected before implementation. Approved changes update
 * the project management plan baselines.
 */
class ProjectChange extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'project_changes';

    public const STATUSES = [
        'submitted', 'under_review', 'approved', 'rejected', 'deferred', 'implemented',
    ];

    public const CHANGE_TYPES = [
        'corrective_action', 'preventive_action', 'defect_repair',
        'scope_change', 'schedule_change', 'cost_change', 'other',
    ];

    // Human-readable labels for change types
    public const CHANGE_TYPE_LABELS = [
        'corrective_action' => 'Corrective Action',
        'preventive_action' => 'Preventive Action',
        'defect_repair'     => 'Defect Repair',
        'scope_change'      => 'Scope Change',
        'schedule_change'   => 'Schedule Change',
        'cost_change'       => 'Cost Change',
        'other'             => 'Other',
    ];

    protected $fillable = [
        'project_id', 'requested_by', 'reviewed_by', 'risk_id', 'issue_id',
        'title', 'description', 'change_type',
        'impacts_scope', 'impacts_schedule', 'impacts_cost', 'impacts_quality',
        'schedule_impact_days', 'cost_impact',
        'status', 'justification', 'review_notes',
        'requested_date', 'decision_date', 'implementation_date',
    ];

    protected $casts = [
        'impacts_scope'        => 'boolean',
        'impacts_schedule'     => 'boolean',
        'impacts_cost'         => 'boolean',
        'impacts_quality'      => 'boolean',
        'schedule_impact_days' => 'integer',
        'cost_impact'          => 'decimal:2',
        'requested_date'       => 'date',
        'decision_date'        => 'date',
        'implementation_date'  => 'date',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function risk(): BelongsTo
    {
        return $this->belongsTo(ProjectRisk::class, 'risk_id');
    }

    public function issue(): BelongsTo
    {
        return $this->belongsTo(ProjectIssue::class, 'issue_id');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getIsApprovedAttribute(): bool
    {
        return in_array($this->status, ['approved', 'implemented']);
    }

    public function getImpactedBaselinesAttribute(): array
    {
        return array_keys(array_filter([
            'scope'    => $this->impacts_scope,
            'schedule' => $this->impacts_schedule,
            'cost'     => $this->impacts_cost,
            'quality'  => $this->impacts_quality,
        ]));
    }
}
