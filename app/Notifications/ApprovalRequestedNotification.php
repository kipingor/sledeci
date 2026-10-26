<?php

namespace App\Notifications;

use App\Models\ApprovalRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApprovalRequestedNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(private ApprovalRequest $approvalRequest) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->approvalRequest->approvable;
        $type = class_basename($subject);
        $title = $subject->title ?? $subject->number ?? "#{$subject->id}";
        $action = $this->approvalRequest->action;
        $requester = $this->approvalRequest->requester->name ?? 'A team member';

        return (new MailMessage)
            ->subject("Approval Required: {$type} — {$title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("{$requester} has requested approval to **{$action}** the following {$type}:")
            ->line("**{$title}**")
            ->when($this->approvalRequest->requester_notes, fn ($m) => $m->line("Note: \"{$this->approvalRequest->requester_notes}\""))
            ->action('Review Request', url('/approvals'))
            ->line('Please review and approve or reject this request in the Approvals Inbox.');
    }

    public function toArray(object $notifiable): array
    {
        $subject = $this->approvalRequest->approvable;

        return [
            'type' => 'approval_requested',
            'approval_id' => $this->approvalRequest->id,
            'approvable_type' => class_basename($subject),
            'approvable_id' => $subject->id,
            'approvable_title' => $subject->title ?? $subject->number ?? null,
            'action' => $this->approvalRequest->action,
            'requested_by_name' => $this->approvalRequest->requester->name,
            'requester_notes' => $this->approvalRequest->requester_notes,
        ];
    }
}
