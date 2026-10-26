<?php

namespace App\Listeners\Lead;

use App\Events\LeadCreated;
use App\Events\LeadStatusChanged;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Cache;

class UpdateLeadMetrics implements ShouldQueue
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    public function handleCreated(LeadCreated $event): void
    {
        Cache::forget('dashboard_metrics');
    }

    public function handleStatusChanged(LeadStatusChanged $event): void
    {
        Cache::forget('dashboard_metrics');
    }
}
