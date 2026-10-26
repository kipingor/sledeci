<?php

namespace App\Models;

use App\Policies\ProjectPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Sledeci\Accounting\Models\Expense;

#[UsePolicy(ProjectPolicy::class)]
class Project extends Model
{
    use HasFactory, SoftDeletes;

    // ── Lifecycle statuses ───────────────────────────────────────────────────
    public const STATUSES = [
        'planning',
        'active',
        'on_hold',
        'completed',
        'cancelled',
    ];

    // ── PMBOK Process Group phases (§1.2.4) ──────────────────────────────────
    public const PHASES = [
        'initiating',
        'planning',
        'executing',
        'monitoring_controlling',
        'closing',
    ];

    protected $fillable = [
        'opportunity_id',
        'name',
        'description',
        'client_id',
        'owner_id',
        'manager_id',
        // PMBOK §4.1 Project Charter fields
        'sponsor_id',
        'objectives',
        'success_criteria',
        'assumptions',
        'constraints',
        'high_level_risks',
        'phase',
        'status',
        'start_date',
        'end_date',
        'completed_at',
        'budget',
        'cost_baseline',   // BAC for EVM (§7.3)
        'currency',
        'metadata',
    ];

    protected $casts = [
        'metadata'        => 'array',
        'success_criteria'=> 'array',
        'assumptions'     => 'array',
        'constraints'     => 'array',
        'budget'          => 'decimal:2',
        'cost_baseline'   => 'decimal:2',
        'start_date'      => 'date',
        'end_date'        => 'date',
        'completed_at'    => 'datetime',
    ];

    // ── Core relations ────────────────────────────────────────────────────────

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /** PMBOK §4.1 — Project Sponsor */
    public function sponsor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sponsor_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function teamMembers(): HasMany
    {
        return $this->hasMany(ProjectTeamMember::class);
    }

    // ── PMBOK Knowledge Area relations ────────────────────────────────────────

    /** PMBOK §11 — Risk Register */
    public function risks(): HasMany
    {
        return $this->hasMany(ProjectRisk::class);
    }

    /** PMBOK §4.3.3 — Issue Log */
    public function issues(): HasMany
    {
        return $this->hasMany(ProjectIssue::class);
    }

    /** PMBOK §4.6 — Change Log */
    public function changes(): HasMany
    {
        return $this->hasMany(ProjectChange::class);
    }

    /** PMBOK §13 — Stakeholder Register */
    public function stakeholders(): HasMany
    {
        return $this->hasMany(ProjectStakeholder::class);
    }

    /** PMBOK §4.4 — Lessons Learned Register */
    public function lessons(): HasMany
    {
        return $this->hasMany(ProjectLesson::class);
    }

    // ── PMBOK §7.4 EVM computed properties ───────────────────────────────────

    /**
     * Budget At Completion (BAC) — the approved cost baseline.
     * Falls back to `budget` if cost_baseline is not set.
     */
    public function getBacAttribute(): float
    {
        return (float) ($this->cost_baseline ?? $this->budget ?? 0);
    }

    /**
     * Planned Value (PV) — the value of work *planned* to be done by now.
     * Calculated as BAC × (elapsed_days / total_days).
     * Returns null if dates are not set.
     */
    public function getPlannedValueAttribute(): ?float
    {
        if (! $this->start_date || ! $this->end_date || $this->bac === 0.0) {
            return null;
        }

        $total   = max(1, $this->start_date->diffInDays($this->end_date));
        $elapsed = min($total, max(0, $this->start_date->diffInDays(now())));

        return round($this->bac * ($elapsed / $total), 2);
    }

    /**
     * Earned Value (EV) — the budgeted value of work *actually completed*.
     * EV = BAC × (overall_progress / 100).
     * Requires progress to be calculated and passed in, or tasks to be loaded.
     */
    public function earnedValue(float $progressPercent): float
    {
        return round($this->bac * ($progressPercent / 100), 2);
    }
}
