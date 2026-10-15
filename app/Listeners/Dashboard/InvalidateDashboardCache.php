<?php

namespace App\Listeners\Dashboard;

use App\Events\LeadCreated;
use App\Events\LeadUpdated;
use App\Events\LeadDeleted;
use App\Events\LeadDocumentUploaded;
use App\Events\LeadStatusChanged;
use App\Services\Dashboard\DashboardMetricsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Invalidate Dashboard Cache Listener
 * 
 * Clears dashboard cache when leads change to ensure fresh data.
 * Implements ShouldQueue for async processing.
 */
class InvalidateDashboardCache implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying.
     */
    public int $backoff = 30;

    /**
     * Create the event listener.
     */
    public function __construct(
        protected DashboardMetricsService $metricsService
    ) {}

    /**
     * Handle lead events
     */
    public function handle(LeadCreated|LeadUpdated|LeadDeleted|LeadStatusChanged|LeadDocumentUploaded $event): void
    {
        try {
            // Clear all dashboard caches
            $this->metricsService->clearCache();

            $eventType = match(true) {
                $event instanceof LeadCreated => 'created',
                $event instanceof LeadUpdated => 'updated',
                $event instanceof LeadDeleted => 'deleted',
                $event instanceof LeadStatusChanged => 'status_changed',
                $event instanceof LeadDocumentUploaded => 'document_uploaded',
                default => 'unknown',
            };

            Log::info('Dashboard cache invalidated', [
                'lead_id' => $event instanceof LeadDocumentUploaded ? $event->leadId : $event->lead->id,
                'event_type' => $eventType,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to invalidate dashboard cache', [
                'lead_id' => $event instanceof LeadDocumentUploaded ? $event->leadId : $event->lead->id,
                'error' => $e->getMessage(),
            ]);
            
            // Don't throw - cache invalidation shouldn't break the flow
        }
    }
}