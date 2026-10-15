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


class LeadMoved implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    use SerializesModels;

    public $lead;
    public $toStage;

    /**
     * Create a new event instance.
     */
    public function __construct(Lead $lead, string $toStage)
    {
        $this->lead = $lead;
        $this->toStage = $toStage;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): PrivateChannel
    {
        // Keep private for security
        return new PrivateChannel('pipeline');
    }

    public function broadcastAs(): string
    {
        // Friendly event name for Echo
        return 'PipelineMoved';
    }

    public function broadcastWith(): array
    {
        // Explicit payload for frontend
        return [
            'lead' => $this->lead->only(['id', 'title', 'stage_id', 'assigned_to', 'updated_at']),
            'to_stage' => $this->toStage,
        ];
    }
}
