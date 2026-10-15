<?php

namespace App\Listeners\Lead;

use App\Events\LeadCreated;
use App\Events\LeadUpdated;
use App\Models\User;
use App\Notifications\LeadCreatedNotification;
use App\Notifications\LeadUpdatedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Send Lead Notification Listener
 *
 * Sends email/database notifications when leads are created or updated.
 * Implements ShouldQueue for async processing.
 */
class SendLeadNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying.
     */
    public int $backoff = 60;

    /**
     * Handle lead created event
     */
    public function handleCreated(LeadCreated $event): void
    {
        try {
            $lead = $event->lead;
            
            // Notify the lead owner
            if ($lead->owner) {
                $lead->owner->notify(new LeadCreatedNotification($lead));
                
                Log::info('Lead created notification sent', [
                    'lead_id' => $lead->id,
                    'recipient_id' => $lead->owner->id,
                ]);
            }

            // Notify admins if configured
            $this->notifyAdmins($lead, 'created');

        } catch (\Throwable $e) {
            Log::error('Failed to send lead created notification', [
                'lead_id' => $event->lead->id,
                'error' => $e->getMessage(),
            ]);
            
            // Re-throw to trigger retry
            throw $e;
        }
    }

    /**
     * Handle lead updated event
     */
    public function handleUpdated(LeadUpdated $event): void
    {
        try {
            $lead = $event->lead;
            $originalData = $event->originalData ?? [];

            // Only notify on significant changes
            $shouldNotify = $this->shouldNotifyOnUpdate($lead, $originalData);

            if (!$shouldNotify) {
                return;
            }

            // Notify the lead owner
            if ($lead->owner) {
                $lead->owner->notify(new LeadUpdatedNotification($lead, $originalData));
                
                Log::info('Lead updated notification sent', [
                    'lead_id' => $lead->id,
                    'recipient_id' => $lead->owner->id,
                ]);
            }

            // If owner changed, notify the new owner
            if (isset($originalData['owner_id']) && $originalData['owner_id'] !== $lead->owner_id) {
                $newOwner = User::find($lead->owner_id);
                if ($newOwner && $newOwner->id !== $lead->owner_id) {
                    $newOwner->notify(new LeadUpdatedNotification($lead, $originalData));
                }
            }

        } catch (\Throwable $e) {
            Log::error('Failed to send lead updated notification', [
                'lead_id' => $event->lead->id,
                'error' => $e->getMessage(),
            ]);
            
            throw $e;
        }
    }

    /**
     * Determine if we should notify on this update
     */
    protected function shouldNotifyOnUpdate($lead, array $originalData): bool
    {
        // Notify on status changes
        if (isset($originalData['status']) && $originalData['status'] !== $lead->status) {
            return true;
        }

        // Notify on owner changes
        if (isset($originalData['owner_id']) && $originalData['owner_id'] !== $lead->owner_id) {
            return true;
        }

        // Notify on pipeline stage changes
        if (isset($originalData['pipeline_stage_id']) && $originalData['pipeline_stage_id'] !== $lead->pipeline_stage_id) {
            return true;
        }

        // Don't notify on minor updates (description changes, etc.)
        return false;
    }

    /**
     * Notify admins about lead changes (if configured)
     */
    protected function notifyAdmins($lead, string $action): void
    {
        // Get admin notification preference from config
        $notifyAdmins = config('lead.notify_admins_on_create', false);

        if (!$notifyAdmins) {
            return;
        }

        // Get admin users
        $admins = User::where('role', 'admin')
            ->orWhere('role', 'super_admin')
            ->get();

        if ($admins->isEmpty()) {
            return;
        }

        foreach ($admins as $admin) {
            if ($action === 'created') {
                $admin->notify(new LeadCreatedNotification($lead));
            }
        }

        Log::info('Admin notifications sent', [
            'lead_id' => $lead->id,
            'admin_count' => $admins->count(),
            'action' => $action,
        ]);
    }
}
