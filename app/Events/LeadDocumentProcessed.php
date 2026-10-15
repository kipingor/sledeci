<?php

namespace App\Events;

use App\Models\LeadDocument;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadDocumentProcessed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public LeadDocument $document, 
        public string $status
    ) {}

    /**
     * The channel the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        // Broadcast on a private channel for the lead so only authorized users can receive it
        return new PrivateChannel('leads.' . $this->document->lead_id);
    }

    public function broadcastWith(): array
    {
        return [
            'document_id' => $this->document->id,
            'lead_id' => $this->document->lead_id,
            'status' => $this->status,
            'ai_summary' => $this->document->ai_summary ?? null,
        ];
    }
}
