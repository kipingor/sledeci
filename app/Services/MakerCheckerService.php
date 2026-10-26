<?php

namespace App\Services;

use App\Models\ApprovalRequest;
use App\Models\CompanySetting;
use App\Models\User;
use App\Notifications\ApprovalDecisionNotification;
use App\Notifications\ApprovalRequestedNotification;
use Illuminate\Database\Eloquent\Model;

class MakerCheckerService
{
    /**
     * Request approval for a model action.
     * The "Make" step — creates a pending ApprovalRequest.
     *
     * @param  Model  $subject  The Tender, Rfp, Invoice, or PurchaseOrder
     * @param  User  $requester  The user requesting the action
     * @param  string  $action  e.g. 'submit', 'publish', 'send'
     * @param  string|null  $notes  Optional notes from the requester
     */
    public function requestApproval(
        Model $subject,
        User $requester,
        string $action,
        ?string $notes = null
    ): ApprovalRequest {
        // Cancel any existing pending requests for this subject
        ApprovalRequest::where('approvable_type', get_class($subject))
            ->where('approvable_id', $subject->id)
            ->where('status', 'pending')
            ->update(['status' => 'cancelled']);

        $request = ApprovalRequest::create([
            'approvable_type' => get_class($subject),
            'approvable_id' => $subject->id,
            'requested_by' => $requester->id,
            'status' => 'pending',
            'action' => $action,
            'requester_notes' => $notes,
            'expires_at' => now()->addDays(7),
            'metadata' => $this->snapshotMetadata($subject),
        ]);

        // Update the subject's approval_status
        $subject->update([
            'approval_status' => 'pending',
            'approval_requested_at' => now(),
        ]);

        // Notify approvers
        if (CompanySetting::current()->notify_on_approval_request) {
            $this->notifyApprovers($request);
        }

        return $request;
    }

    /**
     * Approve an approval request.
     * The "Check" step — reviewer approves.
     */
    public function approve(
        ApprovalRequest $approvalRequest,
        User $reviewer,
        ?string $notes = null
    ): ApprovalRequest {
        $approvalRequest->update([
            'status' => 'approved',
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'reviewer_notes' => $notes,
        ]);

        $subject = $approvalRequest->approvable;
        $subject->update([
            'approval_status' => 'approved',
            'approved_by' => $reviewer->id,
            'approved_at' => now(),
        ]);

        if (CompanySetting::current()->notify_on_approval_decision) {
            $this->notifyRequester($approvalRequest, 'approved');
        }

        return $approvalRequest;
    }

    /**
     * Reject an approval request.
     *
     * @param  string  $reason  Required for rejection
     */
    public function reject(
        ApprovalRequest $approvalRequest,
        User $reviewer,
        string $reason
    ): ApprovalRequest {
        $approvalRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'reviewer_notes' => $reason,
        ]);

        $subject = $approvalRequest->approvable;
        $subject->update(['approval_status' => 'rejected']);

        if (CompanySetting::current()->notify_on_approval_decision) {
            $this->notifyRequester($approvalRequest, 'rejected');
        }

        return $approvalRequest;
    }

    /**
     * Check whether the current user can approve a given request.
     */
    public function canApprove(User $user, ApprovalRequest $request): bool
    {
        $settings = CompanySetting::current();

        // Cannot approve your own request
        if ($user->id === $request->requested_by) {
            return false;
        }

        $allowedRoles = $settings->maker_checker_approver_roles ?? [];

        if (empty($allowedRoles)) {
            // No roles configured — allow any admin
            return $user->hasRole('admin') || $user->hasRole('manager');
        }

        return $user->hasAnyRole($allowedRoles);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function snapshotMetadata(Model $subject): array
    {
        return [
            'type' => class_basename($subject),
            'id' => $subject->id,
            'title' => $subject->title ?? $subject->number ?? null,
            'status' => $subject->status ?? null,
            'created_at' => now()->toIso8601String(),
        ];
    }

    private function notifyApprovers(ApprovalRequest $request): void
    {
        $settings = CompanySetting::current();
        $allowedRoles = $settings->maker_checker_approver_roles ?? ['admin', 'manager'];

        $approvers = User::role($allowedRoles)
            ->where('id', '!=', $request->requested_by)
            ->get();

        foreach ($approvers as $approver) {
            $approver->notify(new ApprovalRequestedNotification($request));
        }
    }

    private function notifyRequester(ApprovalRequest $request, string $decision): void
    {
        $requester = $request->requester;
        if ($requester) {
            $requester->notify(new ApprovalDecisionNotification($request, $decision));
        }
    }
}
