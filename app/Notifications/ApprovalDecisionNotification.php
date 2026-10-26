<?php

namespace App\Notifications;

use App\Models\ApprovalRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApprovalDecisionNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        private ApprovalRequest $approvalRequest,
        private string $decision,  // 'approved' | 'rejected'
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->approvalRequest->approvable;
        $type = class_basename($subject);
        $title = $subject->title ?? $subject->number ?? "#{$subject->id}";
        $reviewer = $this->approvalRequest->reviewer?->name ?? 'A reviewer';
        $isApproved = $this->decision === 'approved';

        $mail = (new MailMessage)
            ->subject(($isApproved ? '✓ Approved' : '✗ Rejected').": {$type} — {$title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("{$reviewer} has **".($isApproved ? 'approved' : 'rejected')."** your request to {$this->approvalRequest->action} the {$type}: **{$title}**.");

        if ($isApproved) {
            $mail->line('You can now proceed with the action.')
                ->action("View {$type}", url('/tenders'));
        } else {
            $mail->line('Reason: '.($this->approvalRequest->reviewer_notes ?? 'No reason provided.'))
                ->line('Please review the feedback and make necessary changes, then submit a new approval request.')
                ->action("View {$type}", url('/tenders'));
        }

        return $mail;
    }

    public function toArray(object $notifiable): array
    {
        $subject = $this->approvalRequest->approvable;

        return [
            'type' => 'approval_'.$this->decision,
            'approval_id' => $this->approvalRequest->id,
            'approvable_type' => class_basename($subject),
            'approvable_id' => $subject->id,
            'approvable_title' => $subject->title ?? $subject->number ?? null,
            'decision' => $this->decision,
            'reviewer_name' => $this->approvalRequest->reviewer?->name,
            'reviewer_notes' => $this->approvalRequest->reviewer_notes,
        ];
    }
}
