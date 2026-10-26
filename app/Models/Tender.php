<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tender extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'owner_id', 'lead_id', 'opportunity_id', 'project_id',
        'title', 'reference_number', 'issuer',
        'document_path', 'document_name', 'analysis_status',
        'status', 'approval_status',
        'submitted_by', 'approved_by',
        'approval_requested_at', 'approved_at',
        'submission_deadline', 'submitted_at',
        'estimated_value', 'currency',
        'extracted_data', 'ai_analysis',
        'checklist', 'information_gaps', 'generated_documents',
        'agent_conversation', 'notes', 'metadata',
    ];

    protected $casts = [
        'submission_deadline' => 'date',
        'submitted_at' => 'date',
        'approval_requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'estimated_value' => 'decimal:2',
        'extracted_data' => 'array',
        'ai_analysis' => 'array',
        'checklist' => 'array',
        'information_gaps' => 'array',
        'generated_documents' => 'array',
        'agent_conversation' => 'array',
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

    public function checklistProgress(): array
    {
        $items = $this->checklist ?? [];
        $total = count($items);
        $done = count(array_filter($items, fn ($i) => $i['done'] ?? false));

        return [
            'total' => $total,
            'done' => $done,
            'percent' => $total > 0 ? (int) round($done / $total * 100) : 0,
        ];
    }

    public function unresolvedGaps(): int
    {
        return count(array_filter($this->information_gaps ?? [], fn ($g) => ! ($g['resolved'] ?? false)));
    }

    public function needsApprovalToSubmit(): bool
    {
        $settings = CompanySetting::current();

        return $settings->makerCheckerEnabledFor('tenders')
            && $this->approval_status !== 'approved';
    }

    public function canBeSubmitted(): bool
    {
        return $this->status === 'drafting'
            && in_array($this->approval_status, ['not_required', 'approved']);
    }
}
