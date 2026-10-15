<?php

namespace App\Events;

use App\Models\Lead;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The lead that was created.
     */
    public Lead $lead;
    
    /**
     * The ID of the deleted lead.
     */
    public int $leadId;

    /**
     * The owner ID of the deleted lead.
     */
    public int $ownerId;

    /**
     * The title of the deleted lead.
     */
    public string $title;

    /**
     * Create a new event instance.
     */
    public function __construct(Lead $lead)
    {
        $this->leadId = $lead->id;
        $this->ownerId = $lead->owner_id;
        $this->title = $lead->title;
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
            new PrivateChannel('user.' . $this->ownerId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'lead.deleted';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->leadId,
            'title' => $this->title,
            'owner_id' => $this->ownerId,
            'deleted_at' => now()->toISOString(),
        ];
    }

    /**
     * Determine if this event should broadcast.
     */
    public function broadcastWhen(): bool
    {
        return config('broadcasting.enabled', false);
    }
}