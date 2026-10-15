<?php

namespace App\Services\Opportunity;

use App\Models\Opportunity;
use App\Enums\OpportunityStage;

class OpportunityService
{
    /**
     * BUG FIX: was returning bool, but OpportunityController assigned the
     * return value back to $opportunity and returned it in the JSON response.
     * Now returns the refreshed Opportunity model.
     */
    public function markAsWon(Opportunity $opportunity): Opportunity
    {
        $opportunity->update(['stage' => OpportunityStage::CLOSED_WON->value]);
        return $opportunity->fresh();
    }

    /**
     * BUG FIX: same return type issue as markAsWon.
     */
    public function markAsLost(Opportunity $opportunity, ?string $reason = null): Opportunity
    {
        $opportunity->update([
            'stage'       => OpportunityStage::CLOSED_LOST->value,
            'description' => $reason
                ? trim(($opportunity->description ?? '') . "\n\nLost reason: {$reason}")
                : $opportunity->description,
        ]);
        return $opportunity->fresh();
    }

    /**
     * BUG FIX: previous version returned raw Builder queries (missing ->count())
     * for every stage except 'total'. Results were non-serialisable objects.
     */
    public function getStatistics(): array
    {
        $counts = Opportunity::query()
            ->selectRaw("
                count(*) as total,
                sum(case when stage = 'qualification' then 1 else 0 end) as qualification,
                sum(case when stage = 'proposal' then 1 else 0 end) as proposal,
                sum(case when stage = 'negotiation' then 1 else 0 end) as negotiation,
                sum(case when stage = 'closed_won' then 1 else 0 end) as closed_won,
                sum(case when stage = 'closed_lost' then 1 else 0 end) as closed_lost,
                sum(case when stage not in ('closed_won','closed_lost') then estimated_value else 0 end) as pipeline_value,
                sum(case when stage = 'closed_won' then estimated_value else 0 end) as won_value
            ")
            ->first();

        return [
            'total'          => (int) $counts->total,
            'qualification'  => (int) $counts->qualification,
            'proposal'       => (int) $counts->proposal,
            'negotiation'    => (int) $counts->negotiation,
            'closed_won'     => (int) $counts->closed_won,
            'closed_lost'    => (int) $counts->closed_lost,
            'pipeline_value' => (float) $counts->pipeline_value,
            'won_value'      => (float) $counts->won_value,
        ];
    }
}