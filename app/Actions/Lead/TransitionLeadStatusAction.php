<?php

namespace App\Actions\Lead;

use App\Enums\LeadStatus;
use App\Events\LeadStatusChanged;
use App\Models\Lead;
use App\Services\Lead\LeadService;
use Illuminate\Support\Facades\Log;
use Throwable;

class TransitionLeadStatusAction
{
    public function __construct(
        protected LeadService $leadService
    ) {}

    public function execute(Lead $lead, string $newStatus): Lead
    {
        $oldStatus = $lead->status;
        $updatedLead = $this->leadService->update($lead, ['status' => $newStatus]);

        try {
            event(new LeadStatusChanged($updatedLead, $oldStatus, LeadStatus::from($newStatus)));
        } catch (Throwable $e) {
            Log::error('Failed to dispatch LeadStatusChanged event: '.$e->getMessage());
        }

        return $updatedLead;
    }
}
