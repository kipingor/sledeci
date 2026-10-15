<?php

namespace App\Listeners\Lead;

use App\Events\LeadCreated;
use App\Events\LeadUpdated;
use App\Events\LeadDeleted;
use App\Models\Activity;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

/**
 * Log Lead Activity Listener
 * 
 * Automatically logs all lead activities to the activity log.
 * Implements ShouldQueue for async processing.
 */
class LogLeadActivity implements ShouldQueue
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
            Activity::create([
                'type' => 'lead_created',
                'description' => "Lead '{$event->lead->title}' was created",
                'subject_type' => get_class($event->lead),
                'subject_id' => $event->lead->id,
                'causer_type' => 'App\Models\User',
                'causer_id' => $event->lead->created_by ?? Auth::id(),
                'properties' => json_encode([
                    'lead_id' => $event->lead->id,
                    'title' => $event->lead->title,
                    'status' => $event->lead->status,
                    'type' => $event->lead->type,
                    'owner_id' => $event->lead->owner_id,
                    'pipeline_stage_id' => $event->lead->pipeline_stage_id,
                ]),
            ]);

            Log::info('Lead created activity logged', [
                'lead_id' => $event->lead->id,
                'title' => $event->lead->title,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to log lead creation activity', [
                'lead_id' => $event->lead->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Don't throw - activity logging shouldn't break the flow
        }
    }

    /**
     * Handle lead updated event
     */
    public function handleUpdated(LeadUpdated $event): void
    {
        try {
            // Determine what changed
            $changes = [];
            $originalData = $event->originalData ?? [];
            
            if (isset($originalData['status']) && $originalData['status'] !== $event->lead->status) {
                $changes[] = "Status: {$originalData['status']} → {$event->lead->status}";
            }
            
            if (isset($originalData['title']) && $originalData['title'] !== $event->lead->title) {
                $changes[] = "Title: {$originalData['title']} → {$event->lead->title}";
            }
            
            if (isset($originalData['owner_id']) && $originalData['owner_id'] !== $event->lead->owner_id) {
                $changes[] = "Owner changed";
            }

            $description = empty($changes) 
                ? "Lead '{$event->lead->title}' was updated"
                : "Lead '{$event->lead->title}' was updated: " . implode(', ', $changes);

            Activity::create([
                'type' => 'lead_updated',
                'description' => $description,
                'subject_type' => get_class($event->lead),
                'subject_id' => $event->lead->id,
                'causer_type' => 'App\Models\User',
                'causer_id' => Auth::id(),
                'properties' => json_encode([
                    'lead_id' => $event->lead->id,
                    'changes' => $changes,
                    'original' => $originalData,
                    'updated' => [
                        'title' => $event->lead->title,
                        'status' => $event->lead->status,
                        'owner_id' => $event->lead->owner_id,
                    ],
                ]),
            ]);

            Log::info('Lead update activity logged', [
                'lead_id' => $event->lead->id,
                'changes' => $changes,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to log lead update activity', [
                'lead_id' => $event->lead->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle lead deleted event
     */
    public function handleDeleted(LeadDeleted $event): void
    {
        try {
            Activity::create([
                'type' => 'lead_deleted',
                'description' => "Lead '{$event->title}' was deleted",
                'subject_type' => get_class($event->lead),
                'subject_id' => $event->leadId,
                'causer_type' => 'App\Models\User',
                'causer_id' => Auth::id(),
                'properties' => json_encode([
                    'lead_id' => $event->leadId,
                    'title' => $event->title,
                    'status' => $event->lead->status,
                    'deleted_at' => now()->toISOString(),
                ]),
            ]);

            Log::info('Lead deletion activity logged', [
                'lead_id' => $event->leadId,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to log lead deletion activity', [
                'lead_id' => $event->leadId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}