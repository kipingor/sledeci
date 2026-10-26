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

class LeadCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The lead that was created.
     */

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Lead $lead
    )
    {
        $this->lead = $lead->loadMissing(['owner', 'pipelineStage', 'user']);
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
            new PrivateChannel('user.' . $this->lead->owner_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'lead.created';
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
            'status' => $this->lead->status->value,
            'status_label' => $this->lead->status->label(),
            'type' => $this->lead->type->value,
            'owner' => [
                'id' => $this->lead->owner->id,
                'name' => $this->lead->owner->name,
            ],
            'pipeline_stage' => [
                'id' => $this->lead->pipelineStage->id,
                'name' => $this->lead->pipelineStage->name,
            ],
            'created_at' => $this->lead->created_at->toISOString(),
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