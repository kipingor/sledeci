<?php

namespace App\Actions\Lead;

use App\Events\LeadMoved;
use App\Models\Lead;
use App\Services\Lead\LeadService;
use Illuminate\Support\Facades\Log;
use Throwable;

class MoveLeadBetweenStagesAction
{
    public function __construct(
        protected LeadService $leadService
    ) {}

    public function execute(Lead $lead, int $newStageId): Lead
    {
        $oldStageId = $lead->stage_id;
        $updatedLead = $this->leadService->update($lead, ['stage_id' => $newStageId]);

        try {
            event(new LeadMoved($updatedLead, $oldStageId, $newStageId));
        } catch (Throwable $e) {
            Log::error('Failed to dispatch LeadMovedBetweenStages event: '.$e->getMessage());
        }

        return $updatedLead;
    }
}
