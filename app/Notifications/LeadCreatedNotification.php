<?php

namespace App\Notifications;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LeadCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Lead $lead
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

        return (new MailMessage)
            ->subject("New Lead Created: {$this->lead->title}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("A new lead has been created and assigned to you.")
            ->line("**Lead:** {$this->lead->title}")
            ->line("**Type:** " . ucfirst($this->lead->type))
            ->line("**Status:** " . ucfirst($this->lead->status))
            ->when($this->lead->description, function ($message) {
                return $message->line("**Description:** {$this->lead->description}");
            })
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
            'lead_type' => $this->lead->type,
            'lead_status' => $this->lead->status,
            'message' => "New lead '{$this->lead->title}' has been assigned to you",
            'action_url' => route('leads.show', $this->lead),
        ];
    }
}