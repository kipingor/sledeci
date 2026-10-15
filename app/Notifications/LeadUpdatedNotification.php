<?php

namespace App\Notifications;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LeadUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Lead $lead,
        public array $originalData = []
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $url = route('leads.show', $this->lead);
        $changes = $this->getChanges();

        $message = (new MailMessage)
            ->subject("Lead Updated: {$this->lead->title}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("A lead assigned to you has been updated.");

        // Add changes
        foreach ($changes as $change) {
            $message->line("• " . $change);
        }

        return $message
            ->action('View Lead', $url)
            ->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'lead_id' => $this->lead->id,
            'lead_title' => $this->lead->title,
            'changes' => $this->getChanges(),
            'message' => "Lead '{$this->lead->title}' has been updated",
            'action_url' => route('leads.show', $this->lead),
        ];
    }

    /**
     * Get human-readable list of changes
     */
    protected function getChanges(): array
    {
        $changes = [];

        if (isset($this->originalData['status']) && $this->originalData['status'] !== $this->lead->status) {
            $changes[] = "Status changed from {$this->originalData['status']} to {$this->lead->status}";
        }

        if (isset($this->originalData['owner_id']) && $this->originalData['owner_id'] !== $this->lead->owner_id) {
            $changes[] = "Owner was changed";
        }

        if (isset($this->originalData['pipeline_stage_id']) && $this->originalData['pipeline_stage_id'] !== $this->lead->pipeline_stage_id) {
            $changes[] = "Pipeline stage was updated";
        }

        if (empty($changes)) {
            $changes[] = "Lead information was updated";
        }

        return $changes;
    }
}