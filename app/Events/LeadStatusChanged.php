<?php

namespace App\Events;

use App\Models\Lead;
use App\Enums\LeadStatus;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The lead whose status changed.
     */
    public Lead $lead;

    /**
     * The previous status.
     */
    public LeadStatus $previousStatus;

    /**
     * The new status.
     */
    public LeadStatus $newStatus;

    /**
     * Create a new event instance.
     */
    public function __construct(Lead $lead, LeadStatus $previousStatus, LeadStatus $newStatus)
    {
        $this->lead = $lead->loadMissing(['owner', 'pipelineStage']);
        $this->previousStatus = $previousStatus;
        $this->newStatus = $newStatus;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('leads'),
            new PrivateChannel('lead.' . $this->lead->id),
            new PrivateChannel('user.' . $this->lead->owner_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'lead.status.changed';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->lead->id,
            'title' => $this->lead->title,
            'previous_status' => [
                'value' => $this->previousStatus->value,
                'label' => $this->previousStatus->label(),
                'color' => $this->previousStatus->color(),
            ],
            'new_status' => [
                'value' => $this->newStatus->value,
                'label' => $this->newStatus->label(),
                'color' => $this->newStatus->color(),
            ],
            'owner' => [
                'id' => $this->lead->owner->id,
                'name' => $this->lead->owner->name,
            ],
            'changed_at' => now()->toISOString(),
        ];
    }

    /**
     * Determine if this event should broadcast.
     */
    public function broadcastWhen(): bool
    {
        return config('broadcasting.enabled', false);
    }

    /**
     * Check if status changed to won
     */
    public function isWon(): bool
    {
        return $this->newStatus === LeadStatus::WON;
    }

    /**
     * Check if status changed to lost
     */
    public function isLost(): bool
    {
        return $this->newStatus === LeadStatus::LOST;
    }

    /**
     * Check if this is a positive transition
     */
    public function isPositiveTransition(): bool
    {
        $positiveStatuses = [
            LeadStatus::CONTACTED,
            LeadStatus::QUALIFIED,
            LeadStatus::PROPOSAL_SENT,
            LeadStatus::NEGOTIATION,
            LeadStatus::WON,
        ];

        return in_array($this->newStatus, $positiveStatuses, true) 
            && $this->newStatus !== LeadStatus::LOST;
    }
}