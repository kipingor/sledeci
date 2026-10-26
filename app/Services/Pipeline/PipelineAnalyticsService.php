<?php

namespace App\Services\Pipeline;

use App\Models\Lead;
use App\Models\PipelineStage;

class PipelineAnalyticsService
{
    public function getConversionRates(): array
    {
        $stages = PipelineStage::all();
        $rates = [];

        foreach ($stages as $stage) {
            $total = Lead::where('pipeline_stage_id', $stage->id)->count();
            $converted = Lead::where('pipeline_stage_id', $stage->id)
                ->whereNotNull('converted_to_opportunity_at')
                ->count();

            $rates[$stage->name] = $total > 0 ? ($converted / $total) * 100 : 0;
        }

        return $rates;
    }

    public function getAverageTimeInStage(): array
    {
        // Implementation for calculating average time leads spend in each stage
        $stages = PipelineStage::all();
        $averageTimes = [];
        foreach ($stages as $stage) {
            $leadsInStage = Lead::where('pipeline_stage_id', $stage->id)->get();
            $totalTime = 0;
            $count = 0;

            foreach ($leadsInStage as $lead) {
                if ($lead->entered_stage_at && $lead->left_stage_at) {
                    $totalTime += $lead->left_stage_at->diffInDays($lead->entered_stage_at);
                    $count++;
                }
            }

            $averageTimes[$stage->name] = $count > 0 ? ($totalTime / $count) : 0;
        }
        
        return $averageTimes;
    }

    public function getPipelineVelocity(): float
    {
        // Implementation for calculating pipeline velocity
        $totalLeads = Lead::count();
        $convertedLeads = Lead::whereNotNull('converted_to_opportunity_at')->count();

        return $totalLeads > 0 ? ($convertedLeads / $totalLeads) * 100 : 0;
    }
}