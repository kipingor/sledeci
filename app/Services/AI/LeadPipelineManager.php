<?php

namespace App\Services\AI;

use App\Events\LeadMoved;
use App\Events\LeadUpdated;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;

/**
 * Lead Pipeline Manager
 *
 * Manages lead movements through pipeline stages with AI-enhanced
 * tracking and audit logging. This service focuses on lead-specific
 * pipeline operations and maintains a complete audit trail.
 *
 * Renamed from PipelineService to avoid naming conflicts with
 * App\Services\Pipeline\PipelineService which handles general
 * pipeline operations (stage management, analytics, reordering).
 */
class LeadPipelineManager
{
    /**
     * Move a lead to another pipeline stage and log the change.
     *
     * This method handles the complete lifecycle of moving a lead:
     * 1. Acquires a pessimistic lock on the lead
     * 2. Updates the pipeline stage
     * 3. Creates an audit log entry
     * 4. Dispatches relevant events
     *
     * @param int $leadId The ID of the lead to move
     * @param string $toStageKey The key of the destination pipeline stage
     * @param int|null $userId The ID of the user performing the action
     * @return Lead The updated lead with refreshed relationships
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function moveLead(int $leadId, string $toStageKey, ?int $userId = null): Lead
    {
        return DB::transaction(function () use ($leadId, $toStageKey, $userId) {
            // Lock the lead record to prevent concurrent modifications
            $lead = Lead::lockForUpdate()->findOrFail($leadId);

            // Find the destination stage
            $stage = PipelineStage::where('key', $toStageKey)->firstOrFail();

            // Store old value for audit trail
            $old = ['pipeline_stage_id' => $lead->pipeline_stage_id];

            // Update the lead's pipeline stage
            $lead->pipeline_stage_id = $stage->id;
            $lead->save();

            // Create audit log entry
            AuditLog::create([
                'auditable_type' => Lead::class,
                'auditable_id' => $lead->id,
                'user_id' => $userId,
                'event' => 'pipeline_moved',
                'old_values' => $old,
                'new_values' => ['pipeline_stage_id' => $stage->id],
            ]);

            // Refresh the lead to get updated relationships
            $lead->refresh();

            // Dispatch events for listeners
            LeadUpdated::dispatch($lead);
            event(new LeadMoved($lead, $toStageKey));

            return $lead;
        });
    }

    /**
     * Move a lead by stage ID (alternative method)
     *
     * @param int $leadId
     * @param int $toStageId
     * @param int|null $userId
     * @return Lead
     */
    public function moveLeadByStageId(int $leadId, int $toStageId, ?int $userId = null): Lead
    {
        $stage = PipelineStage::findOrFail($toStageId);
        return $this->moveLead($leadId, $stage->key, $userId);
    }

    /**
     * Get the movement history for a lead
     *
     * @param int $leadId
     * @return \Illuminate\Support\Collection
     */
    public function getLeadMovementHistory(int $leadId)
    {
        return AuditLog::where('auditable_type', Lead::class)
            ->where('auditable_id', $leadId)
            ->where('event', 'pipeline_moved')
            ->with('user')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Validate if a lead can move to a specific stage
     *
     * @param Lead $lead
     * @param string $toStageKey
     * @return bool
     */
    public function canMoveTo(Lead $lead, string $toStageKey): bool
    {
        $stage = PipelineStage::where('key', $toStageKey)->first();
        
        if (!$stage) {
            return false;
        }

        // Add business logic here to validate stage transitions
        // For example: Can't move to closed_won without an opportunity
        if ($stage->type === 'closed_won' && !$lead->opportunity) {
            return false;
        }

        return true;
    }
}
