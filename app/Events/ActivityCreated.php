<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\AuditLog;

/**
 * FIX: Previously imported ActivityLog (deleted).
 * Now uses the canonical AuditLog model.
 */
class ActivityCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public AuditLog $activity
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('activity');
    }

    public function broadcastAs(): string
    {
        return 'activity.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id'             => $this->activity->id,
            'event'          => $this->activity->event,
            'auditable_type' => class_basename($this->activity->auditable_type),
            'auditable_id'   => $this->activity->auditable_id,
            'user_id'        => $this->activity->user_id,
            'created_at'     => $this->activity->created_at,
        ];
    }
}