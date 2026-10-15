<?php

namespace App\Services\Dashboard;

use App\Models\Lead;
use App\Models\Activity;
use App\Models\PipelineStage;
use App\Enums\LeadStatus;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardAnalyticsService
{
    /**
     * Get overview metrics
     */
    public function getOverviewMetrics(array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? Carbon::now()->subDays(30);
        $dateTo = $filters['date_to'] ?? Carbon::now();

        $query = Lead::query();

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        return [
            'total_leads' => (clone $query)->count(),
            'new_leads' => (clone $query)->where('created_at', '>=', $dateFrom)->count(),
            'qualified_leads' => (clone $query)->where('status', LeadStatus::QUALIFIED)->count(),
            'won_leads' => (clone $query)->where('status', LeadStatus::WON)->count(),
            'lost_leads' => (clone $query)->where('status', LeadStatus::LOST)->count(),
            'conversion_rate' => $this->calculateConversionRate($query),
            'average_deal_size' => (clone $query)
                ->where('status', LeadStatus::WON)
                ->avg('estimated_value') ?? 0,
            'total_pipeline_value' => (clone $query)
                ->whereNotIn('status', [LeadStatus::WON, LeadStatus::LOST])
                ->sum('estimated_value') ?? 0,
        ];
    }

    /**
     * Calculate conversion rate
     */
    private function calculateConversionRate($query): float
    {
        $total = (clone $query)->whereIn('status', [LeadStatus::WON, LeadStatus::LOST])->count();
        $won = (clone $query)->where('status', LeadStatus::WON)->count();

        if ($total === 0) {
            return 0;
        }

        return round(($won / $total) * 100, 2);
    }

    /**
     * Get leads by status distribution
     */
    public function getLeadsByStatus(array $filters = []): array
    {
        $query = Lead::query();

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        $data = $query->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->status->value,
                    'label' => $item->status->label(),
                    'count' => $item->count,
                    'color' => $item->status->color(),
                ];
            });

        return $data->toArray();
    }

    /**
     * Get leads by source
     */
    public function getLeadsBySource(array $filters = []): array
    {
        $query = Lead::query();

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        $data = $query->select(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.source')) as source"), DB::raw('count(*) as count'))
            ->whereNotNull('metadata')
            ->groupBy('source')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'source' => $item->source ?? 'Unknown',
                    'count' => $item->count,
                ];
            });

        return $data->toArray();
    }

    /**
     * Get pipeline by stage
     */
    public function getPipelineByStage(array $filters = []): array
    {
        $query = Lead::query()
            ->whereNotIn('status', [LeadStatus::WON, LeadStatus::LOST]);

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        $data = $query->select(
            'pipeline_stage_id',
            DB::raw('count(*) as count'),
            DB::raw('COALESCE(sum(estimated_value), 0) as total_value')
        )
            ->with('pipelineStage')
            ->groupBy('pipeline_stage_id')
            ->get()
            ->map(function ($item) {
                return [
                    'stage' => $item->pipelineStage->name ?? 'Unknown',
                    'count' => $item->count,
                    'value' => $item->total_value,
                ];
            });

        return $data->toArray();
    }

    /**
     * Get conversion funnel data
     */
    public function getConversionFunnel(array $filters = []): array
    {
        $query = Lead::query();

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        $total = (clone $query)->count();
        $contacted = (clone $query)->whereNotNull('contacted_at')->count();
        $qualified = (clone $query)->where('status', LeadStatus::QUALIFIED)->count();
        $proposal = (clone $query)->whereNotNull('qualified_at')->count();
        $won = (clone $query)->where('status', LeadStatus::WON)->count();

        return [
            [
                'stage' => 'Total Leads',
                'count' => $total,
                'percentage' => 100,
            ],
            [
                'stage' => 'Contacted',
                'count' => $contacted,
                'percentage' => $total > 0 ? round(($contacted / $total) * 100, 2) : 0,
            ],
            [
                'stage' => 'Qualified',
                'count' => $qualified,
                'percentage' => $total > 0 ? round(($qualified / $total) * 100, 2) : 0,
            ],
            [
                'stage' => 'Proposal',
                'count' => $proposal,
                'percentage' => $total > 0 ? round(($proposal / $total) * 100, 2) : 0,
            ],
            [
                'stage' => 'Won',
                'count' => $won,
                'percentage' => $total > 0 ? round(($won / $total) * 100, 2) : 0,
            ],
        ];
    }

    /**
     * Get leads over time (time series)
     */
    public function getLeadsOverTime(array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? Carbon::now()->subDays(30);
        $dateTo = $filters['date_to'] ?? Carbon::now();
        $groupBy = $filters['group_by'] ?? 'day'; // day, week, month

        $query = Lead::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo]);

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        // Determine date format based on grouping
        $dateFormat = match ($groupBy) {
            'week' => '%Y-%u',
            'month' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        $data = $query->select(
            DB::raw("DATE_FORMAT(created_at, '$dateFormat') as period"),
            DB::raw('count(*) as count')
        )
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(function ($item) use ($groupBy) {
                return [
                    'period' => $item->period,
                    'date' => $this->formatPeriodLabel($item->period, $groupBy),
                    'count' => $item->count,
                ];
            });

        return $data->toArray();
    }

    /**
     * Format period label for display
     */
    private function formatPeriodLabel(string $period, string $groupBy): string
    {
        return match ($groupBy) {
            'week' => "Week $period",
            'month' => Carbon::createFromFormat('Y-m', $period)->format('M Y'),
            default => Carbon::createFromFormat('Y-m-d', $period)->format('M d'),
        };
    }

    /**
     * Get activity statistics
     */
    public function getActivityStats(array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? Carbon::now()->subDays(30);
        $dateTo = $filters['date_to'] ?? Carbon::now();

        $query = Activity::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo]);

        if (!empty($filters['owner_id'])) {
            $query->where('user_id', $filters['owner_id']);
        }

        return [
            'total_activities' => (clone $query)->count(),
            'completed_activities' => (clone $query)->whereNotNull('completed_at')->count(),
            'pending_activities' => (clone $query)->whereNull('completed_at')->count(),
            'overdue_activities' => (clone $query)
                ->whereNull('completed_at')
                ->whereNotNull('scheduled_at')
                ->where('scheduled_at', '<', now())
                ->count(),
            'by_type' => $this->getActivitiesByType($query),
        ];
    }

    /**
     * Get activities grouped by type
     */
    private function getActivitiesByType($query): array
    {
        return (clone $query)
            ->select('type', DB::raw('count(*) as count'))
            ->groupBy('type')
            ->get()
            ->map(function ($item) {
                return [
                    'type' => $item->type->value,
                    'label' => $item->type->label(),
                    'count' => $item->count,
                ];
            })
            ->toArray();
    }

    /**
     * Get lead velocity (average time to close)
     */
    public function getLeadVelocity(array $filters = []): array
    {
        $query = Lead::query()
            ->where('status', LeadStatus::WON)
            ->whereNotNull('won_at');

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        $leads = $query->get();

        if ($leads->isEmpty()) {
            return [
                'average_days' => 0,
                'median_days' => 0,
                'fastest_days' => 0,
                'slowest_days' => 0,
            ];
        }

        $days = $leads->map(function ($lead) {
            return Carbon::parse($lead->created_at)->diffInDays($lead->won_at);
        });

        return [
            'average_days' => round($days->avg(), 1),
            'median_days' => $days->median(),
            'fastest_days' => $days->min(),
            'slowest_days' => $days->max(),
        ];
    }

    /**
     * Get team performance metrics
     */
    public function getTeamPerformance(array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? Carbon::now()->subDays(30);
        $dateTo = $filters['date_to'] ?? Carbon::now();

        $data = Lead::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->with('owner')
            ->select(
                'owner_id',
                DB::raw('count(*) as total_leads'),
                DB::raw('sum(case when status = "won" then 1 else 0 end) as won_leads'),
                DB::raw('sum(case when status = "lost" then 1 else 0 end) as lost_leads'),
                DB::raw('avg(estimated_value) as avg_deal_size'),
                DB::raw('sum(case when status = "won" then estimated_value else 0 end) as total_revenue')
            )
            ->groupBy('owner_id')
            ->get()
            ->map(function ($item) {
                $conversionRate = ($item->total_leads > 0)
                    ? round(($item->won_leads / $item->total_leads) * 100, 2)
                    : 0;

                return [
                    'owner_id' => $item->owner_id,
                    'owner_name' => $item->owner->name ?? 'Unknown',
                    'total_leads' => $item->total_leads,
                    'won_leads' => $item->won_leads,
                    'lost_leads' => $item->lost_leads,
                    'conversion_rate' => $conversionRate,
                    'avg_deal_size' => round($item->avg_deal_size ?? 0, 2),
                    'total_revenue' => round($item->total_revenue ?? 0, 2),
                ];
            })
            ->sortByDesc('total_revenue')
            ->values();

        return $data->toArray();
    }

    /**
     * Get win/loss analysis
     */
    public function getWinLossAnalysis(array $filters = []): array
    {
        $query = Lead::query()
            ->whereIn('status', [LeadStatus::WON, LeadStatus::LOST]);

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        $wonCount = (clone $query)->where('status', LeadStatus::WON)->count();
        $lostCount = (clone $query)->where('status', LeadStatus::LOST)->count();
        $total = $wonCount + $lostCount;

        $wonValue = (clone $query)->where('status', LeadStatus::WON)->sum('estimated_value') ?? 0;
        $lostValue = (clone $query)->where('status', LeadStatus::LOST)->sum('estimated_value') ?? 0;

        return [
            'won' => [
                'count' => $wonCount,
                'percentage' => $total > 0 ? round(($wonCount / $total) * 100, 2) : 0,
                'value' => $wonValue,
            ],
            'lost' => [
                'count' => $lostCount,
                'percentage' => $total > 0 ? round(($lostCount / $total) * 100, 2) : 0,
                'value' => $lostValue,
            ],
            'total' => [
                'count' => $total,
                'value' => $wonValue + $lostValue,
            ],
        ];
    }
}
