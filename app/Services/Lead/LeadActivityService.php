<?php

namespace App\Services\Lead;

use App\Models\Activity;
use App\Models\Lead;
use Illuminate\Support\Facades\Auth;

class LeadActivityService
{
    /**
     * Log a lead activity.
     *
     * @param  string  $activityType
     * @param  string|null  $notes
     */
    public function logActivity(Lead $lead, string $action, array $data = []): Activity
    {
        return Activity::create([
            'lead_id' => $lead->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'data' => $data,
            'created_at' => now(),
        ]);
    }

    public function getActivityFeed(Lead $lead)
    {
        return $lead->activities()->with('user')->latest()->get();
    }
}
