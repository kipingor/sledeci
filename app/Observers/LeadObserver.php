<?php

namespace App\Observers;

use App\Models\Lead;
use App\Services\AutomationService;

class LeadObserver
{
    public function __construct(
        protected AutomationService $automationService
    ) {}

    /**
     * Handle the Lead "updated" event.
     */
    public function updated(Lead $lead): void
    {
        // Check if status changed
        if ($lead->isDirty('status')) {
            $oldStatus = $lead->getOriginal('status');
            $this->automationService->handleLeadStatusChanged($lead, $oldStatus);
        }
    }
}