<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rfp extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'owner_id', 'lead_id', 'opportunity_id', 'project_id',
        'type', 'title', 'reference_number', 'description', 'scope_of_work',
        'requirements', 'evaluation_criteria',
        'issue_date', 'submission_deadline', 'award_date',
        'budget', 'currency', 'status',
        'approval_status', 'submitted_by', 'approved_by',
        'approval_requested_at', 'approved_at',
        'document_path', 'document_name', 'notes', 'metadata',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'submission_deadline' => 'date',
        'award_date' => 'date',
        'approval_requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'budget' => 'decimal:2',
        'requirements' => 'array',
        'evaluation_criteria' => 'array',
        'metadata' => 'array',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function approvalRequests(): MorphMany
    {
        return $this->morphMany(ApprovalRequest::class, 'approvable');
    }

    public function latestApprovalRequest(): ?ApprovalRequest
    {
        return $this->approvalRequests()->latest()->first();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function daysUntilDeadline(): ?int
    {
        if (! $this->submission_deadline) {
            return null;
        }

        return (int) now()->startOfDay()->diffInDays($this->submission_deadline, false);
    }

    public function isPublishable(): bool
    {
        return in_array($this->status, ['draft', 'review'])
            && in_array($this->approval_status, ['not_required', 'approved']);
    }

    public function needsApprovalToPublish(): bool
    {
        $settings = CompanySetting::current();

        return $settings->makerCheckerEnabledFor('rfp')
            && $this->approval_status !== 'approved';
    }
}
