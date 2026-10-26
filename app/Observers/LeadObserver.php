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
            // 'status' is cast to the LeadStatus enum, so getOriginal() returns the enum.
            $original  = $lead->getOriginal('status');
            $oldStatus = $original instanceof \BackedEnum ? (string) $original->value : (string) $original;
            $this->automationService->handleLeadStatusChanged($lead, $oldStatus);
        }
    }
}