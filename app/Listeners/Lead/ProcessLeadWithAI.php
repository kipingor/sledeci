<?php

namespace App\Listeners\Lead;

use App\Events\LeadCreated;
use App\Jobs\ProcessLeadWithAI as ProcessLeadWithAIJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Process Lead With AI Listener
 * 
 * Queues AI processing job for new leads.
 * Implements ShouldQueue for async processing.
 */
class ProcessLeadWithAI implements ShouldQueue
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
    public function handle(LeadCreated $event): void
    {
        try {
            $lead = $event->lead;

            // Only process conversation-type leads with AI
            if ($lead->type !== 'conversation') {
                Log::info('Skipping AI processing for non-conversation lead', [
                    'lead_id' => $lead->id,
                    'type' => $lead->type,
                ]);
                return;
            }

            // Check if lead has content to process
            if (empty($lead->description) && empty($lead->conversation_content)) {
                Log::info('Skipping AI processing - no content', [
                    'lead_id' => $lead->id,
                ]);
                return;
            }

            // Dispatch AI processing job
            ProcessLeadWithAIJob::dispatch($lead)
                ->onQueue('ai-processing')
                ->delay(now()->addSeconds(10)); // Small delay to ensure DB commit

            Log::info('AI processing job queued', [
                'lead_id' => $lead->id,
                'queue' => 'ai-processing',
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to queue AI processing job', [
                'lead_id' => $event->lead->id,
                'error' => $e->getMessage(),
            ]);
            
            // Don't throw - AI processing is optional
        }
    }
}