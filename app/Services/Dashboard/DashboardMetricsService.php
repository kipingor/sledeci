<?php

namespace App\Services\Dashboard;

use App\Enums\LeadStatus;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\PipelineStage;
use App\Models\Project;
use App\Models\User;
use App\Services\Lead\LeadService;
use App\Services\Pipeline\PipelineService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Sledeci\Accounting\Models\Invoice;

/**
 * Consolidated Dashboard Service
 *
 * Combines the previous DashboardMetricsService and DashboardAnalyticsService
 * into a single class providing all data for dashboard overview and analytics endpoints.
 *
 * BUG FIXES in this version:
 *   1. getOverviewMetrics() was comparing with raw strings 'won'/'qualified' instead
 *      of LeadStatus enum constants. On a MySQL table with an enum column cast to a
 *      PHP enum, Eloquent stores the ->value() (string) but raw string comparisons
 *      can silently fail if the enum value doesn't match exactly or if the ORM
 *      normalises values. Using LeadStatus::WON / LeadStatus::QUALIFIED is correct.
 *
 *   2. getOverviewMetrics() returned 'lost_leads' key which was missing from
 *      the TypeScript OverviewMetrics interface. Added properly.
 */
class DashboardMetricsService
{
    public function __construct(
        protected LeadService $leadService,
        protected PipelineService $pipelineService,
    ) {}

    // ── Cache ─────────────────────────────────────────────────────────────────

    public function clearCache(?int $userId = null): void
    {
        $keys = [
            'dashboard.overview.'.($userId ?? 'all'),
            'dashboard.activity.week',
            'dashboard.activity.month',
            'dashboard.pipeline',
        ];
        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }

    // ── Overview Metrics (Web controller) ─────────────────────────────────────

    public function getOverview(?int $userId = null, bool $useCache = true): array
    {
        $cacheKey = 'dashboard.overview.'.($userId ?? 'all');

        if ($useCache) {
            return Cache::remember(
                $cacheKey,
                now()->addMinutes(5),
                fn () => $this->calculateOverview($userId)
            );
        }

        return $this->calculateOverview($userId);
    }

    protected function calculateOverview(?int $userId): array
    {
        $leadQuery = Lead::query()->when($userId, fn ($q) => $q->where('owner_id', $userId));
        $oppQuery = Opportunity::query()->when($userId, fn ($q) => $q->where('owner_id', $userId));

        return [
            'leads' => (clone $leadQuery)->count(),
            'active_leads' => (clone $leadQuery)->whereIn('status', LeadStatus::active())->count(),
            'opportunities' => (clone $oppQuery)->count(),
            'open_pipeline' => (clone $oppQuery)->whereNotIn('stage', ['closed_won', 'closed_lost'])->count(),
            'projects' => Project::when($userId, fn ($q) => $q->where('owner_id', $userId))->count(),
            'active_projects' => Project::where('status', 'active')
                ->when($userId, fn ($q) => $q->where('owner_id', $userId))->count(),
            'overdue_invoices' => Invoice::where('status', 'overdue')->count(),
            'conversion_rate' => $this->leadService->getStatistics()['conversion_rate'] ?? 0,
        ];
    }

    // ── Activity Metrics ──────────────────────────────────────────────────────

    public function getActivityMetrics(string $period = 'month'): array
    {
        $cacheKey = "dashboard.activity.{$period}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($period) {
            $from = match ($period) {
                'week' => now()->subWeek(),
                'quarter' => now()->subQuarter(),
                default => now()->subMonth(),
            };

            return [
                'leads_created' => Lead::where('created_at', '>=', $from)->count(),
                'leads_converted' => Lead::whereNotNull('converted_to_opportunity_at')
                    ->where('converted_to_opportunity_at', '>=', $from)->count(),
                'opportunities_won' => Opportunity::where('stage', 'closed_won')
                    ->where('updated_at', '>=', $from)->count(),
                'activities_logged' => Activity::where('created_at', '>=', $from)->count(),
                'projects_completed' => Project::where('status', 'completed')
                    ->where('completed_at', '>=', $from)->count(),
                'revenue' => Invoice::where('status', 'paid')
                    ->where('updated_at', '>=', $from)->sum('total'),
            ];
        });
    }

    // ── Overview Metrics (Analytics API — was DashboardAnalyticsService) ──────

    /**
     * Filterable overview for the /api/v1/analytics/overview endpoint.
     *
     * BUG FIX: Previous version used raw strings ('won', 'qualified') instead of
     * LeadStatus enum constants. The Lead model casts the 'status' column to the
     * LeadStatus enum, so Eloquent stores and compares enum->value strings. Using
     * the enum constants is both more reliable and prevents typo-related silent bugs.
     */
    public function getOverviewMetrics(array $filters = []): array
    {
        $dateFrom = isset($filters['date_from']) ? Carbon::parse($filters['date_from']) : now()->subDays(30);
        $dateTo = isset($filters['date_to']) ? Carbon::parse($filters['date_to']) : now();

        $query = Lead::query();
        if (! empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        return [
            'total_leads' => (clone $query)->count(),
            'new_leads' => (clone $query)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'converted' => (clone $query)->whereNotNull('converted_to_opportunity_at')->count(),
            'conversion_rate' => $this->calcConversionRate(clone $query),
            'total_pipeline_value' => (float) Lead::whereNotNull('pipeline_stage_id')->sum('estimated_value'),
            'average_deal_size' => $query->count() > 0
                                          ? round((float) $query->sum('estimated_value') / $query->count(), 2)
                                          : 0,
            'total_revenue' => Invoice::where('status', 'paid')
                ->whereBetween('updated_at', [$dateFrom, $dateTo])
                ->sum('total'),
            'period' => ['from' => $dateFrom->toDateString(), 'to' => $dateTo->toDateString()],
            // FIX: was using raw strings 'won'/'qualified' — use enum constants
            'won_leads' => Lead::where('status', LeadStatus::WON)->count(),
            'qualified_leads' => Lead::where('status', LeadStatus::QUALIFIED)->count(),
            'lost_leads' => Lead::where('status', LeadStatus::LOST)->count(),
        ];
    }

    /**
     * Leads grouped by status — for funnel/bar charts.
     */
    public function getLeadsByStatus(array $filters = []): array
    {
        $rows = Lead::query()
            ->select('status', DB::raw('count(*) as count'))
            ->when(! empty($filters['owner_id']), fn ($q) => $q->where('owner_id', $filters['owner_id']))
            ->groupBy('status')
            ->get();

        return $rows->map(function ($row) {
            // getRawOriginal() bypasses the enum cast to get the stored string value.
            // This prevents TypeErrors when passing the raw value to tryFrom().
            $raw = $row->getRawOriginal('status');
            $enum = LeadStatus::tryFrom($raw);

            return [
                'status' => $raw,
                'label' => $enum?->label() ?? ucfirst(str_replace('_', ' ', $raw ?? '')),
                'count' => (int) $row->count,
                'color' => $enum?->color() ?? 'gray',
            ];
        })->values()->toArray();
    }

    /**
     * Pipeline distribution by stage.
     */
    public function getPipelineByStage(array $filters = []): array
    {
        $cacheKey = 'dashboard.pipeline';

        return Cache::remember($cacheKey, now()->addMinutes(5), function () {
            return PipelineStage::withCount('leads')->orderBy('order')->get()
                ->map(fn ($stage) => [
                    'stage' => $stage->name,
                    'key' => $stage->key,
                    'count' => $stage->leads_count,
                    'color' => $stage->color,
                ])
                ->toArray();
        });
    }

    /**
     * Lead volume over time for trend charts.
     */
    public function getLeadsOverTime(array $filters = []): array
    {
        $days = $filters['days'] ?? 30;
        $from = now()->subDays($days);

        return Lead::query()
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', $from)
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'count' => $row->count])
            ->toArray();
    }

    /**
     * Conversion funnel percentages.
     */
    public function getConversionFunnel(array $filters = []): array
    {
        $totalLeads = Lead::count() ?: 1;
        $converted = Lead::whereNotNull('converted_to_opportunity_at')->count();
        $wons = Opportunity::where('stage', 'closed_won')->count();
        $projects = Project::whereNotNull('opportunity_id')->count();

        return [
            ['stage' => 'Leads',         'count' => $totalLeads, 'percentage' => 100.0],
            ['stage' => 'Opportunities', 'count' => $converted,  'percentage' => round($converted / $totalLeads * 100, 1)],
            ['stage' => 'Won',           'count' => $wons,       'percentage' => round($wons / $totalLeads * 100, 1)],
            ['stage' => 'Projects',      'count' => $projects,   'percentage' => round($projects / $totalLeads * 100, 1)],
        ];
    }

    /**
     * Team performance metrics.
     */
    public function getTeamPerformance(array $filters = []): array
    {
        return User::select('users.id', 'users.name')
            ->withCount([
                'leads',
                'leads as won_leads_count' => fn ($q) => $q->where('status', LeadStatus::WON),
            ])
            ->orderByDesc('leads_count')
            ->limit(10)
            ->get()
            ->map(fn ($user) => [
                'name' => $user->name,
                'total_leads' => $user->leads_count,
                'won_leads' => $user->won_leads_count,
                'conversion_rate' => $user->leads_count > 0
                    ? round($user->won_leads_count / $user->leads_count * 100, 1)
                    : 0,
            ])
            ->toArray();
    }

    /**
     * Top performers (users with most won leads).
     */
    public function getTopPerformers(int $limit = 10, string $period = 'month'): array
    {
        $from = match ($period) {
            'week' => now()->subWeek(),
            'quarter' => now()->subQuarter(),
            default => now()->subMonth(),
        };

        return User::select('users.id', 'users.name')
            ->withCount([
                'leads as won_leads_count' => fn ($q) => $q->where('status', LeadStatus::WON)
                    ->where('won_at', '>=', $from),
            ])
            ->orderByDesc('won_leads_count')
            ->limit($limit)
            ->get()
            ->map(fn ($user) => [
                'name' => $user->name,
                'won_leads' => $user->won_leads_count,
            ])
            ->toArray();
    }

    /**
     * Leads grouped by source.
     */
    public function getLeadsBySource(array $filters = []): array
    {
        $query = Lead::query()
            ->when(! empty($filters['owner_id']), fn ($q) => $q->where('owner_id', $filters['owner_id']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->where('created_at', '>=', $filters['date_from']));

        return $query
            ->select(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.source')) as source"), DB::raw('count(*) as count'))
            ->whereNotNull('metadata')
            ->groupBy('source')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn ($item) => ['source' => $item->source ?? 'Unknown', 'count' => $item->count])
            ->toArray();
    }

    /**
     * Lead Chart Data (for line charts showing leads created over time).
     */
    public function getLeadsChartData(int $days = 30): array
    {
        $from = now()->subDays($days);
        $data = Lead::query()
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', $from)
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'count' => $row->count])
            ->toArray();

        return [
            'data' => $data,
            'period' => ['from' => $from->toDateString(), 'to' => now()->toDateString()],
            'start_date' => $from->toDateString(),
            'end_date' => now()->toDateString(),
        ];
    }

    /**
     * CRM activity statistics.
     */
    public function getActivityStats(array $filters = []): array
    {
        $from = isset($filters['date_from']) ? Carbon::parse($filters['date_from']) : now()->subDays(30);
        $to = isset($filters['date_to']) ? Carbon::parse($filters['date_to']) : now();

        $query = Activity::whereBetween('created_at', [$from, $to])
            ->when(! empty($filters['owner_id']), fn ($q) => $q->where('user_id', $filters['owner_id']));

        return [
            'total' => (clone $query)->count(),
            'completed' => (clone $query)->whereNotNull('completed_at')->count(),
            'pending' => (clone $query)->whereNull('completed_at')->count(),
            'overdue' => (clone $query)
                ->whereNull('completed_at')
                ->whereNotNull('scheduled_at')
                ->where('scheduled_at', '<', now())
                ->count(),
            'by_type' => (clone $query)
                ->select('type', DB::raw('count(*) as count'))
                ->groupBy('type')
                ->get()
                ->keyBy('type')
                ->map(fn ($r) => $r->count)
                ->toArray(),
        ];
    }

    /**
     * Average days to close a won lead (velocity).
     */
    public function getLeadVelocity(array $filters = []): array
    {
        $leads = Lead::where('status', LeadStatus::WON)
            ->whereNotNull('won_at')
            ->when(! empty($filters['owner_id']), fn ($q) => $q->where('owner_id', $filters['owner_id']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->where('created_at', '>=', $filters['date_from']))
            ->get(['created_at', 'won_at']);

        if ($leads->isEmpty()) {
            return ['average_days' => 0, 'median_days' => 0, 'fastest_days' => 0, 'slowest_days' => 0, 'sample_size' => 0];
        }

        $days = $leads->map(fn ($l) => $l->created_at->diffInDays($l->won_at))->sort()->values();

        return [
            'average_days' => round($days->avg(), 1),
            'median_days' => $days->count() % 2 === 0
                ? round(($days->get(intdiv($days->count(), 2) - 1) + $days->get(intdiv($days->count(), 2))) / 2, 1)
                : $days->get(intdiv($days->count(), 2)),
            'fastest_days' => $days->first(),
            'slowest_days' => $days->last(),
            'sample_size' => $days->count(),
        ];
    }

    /**
     * Win/loss analysis with nested structure matching TypeScript WinLossAnalysis interface.
     */
    public function getWinLossAnalysis(array $filters = []): array
    {
        $query = Lead::whereIn('status', [LeadStatus::WON, LeadStatus::LOST])
            ->when(! empty($filters['owner_id']), fn ($q) => $q->where('owner_id', $filters['owner_id']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->where('created_at', '>=', $filters['date_from']));

        $wonCount = (clone $query)->where('status', LeadStatus::WON)->count();
        $lostCount = (clone $query)->where('status', LeadStatus::LOST)->count();
        $total = $wonCount + $lostCount ?: 1;

        $wonValue = (float) ((clone $query)->where('status', LeadStatus::WON)->sum('estimated_value') ?? 0);
        $lostValue = (float) ((clone $query)->where('status', LeadStatus::LOST)->sum('estimated_value') ?? 0);

        return [
            'won' => [
                'count' => $wonCount,
                'percentage' => round($wonCount / $total * 100, 1),
                'value' => $wonValue,
            ],
            'lost' => [
                'count' => $lostCount,
                'percentage' => round($lostCount / $total * 100, 1),
                'value' => $lostValue,
            ],
            'total' => [
                'count' => $wonCount + $lostCount,
                'value' => $wonValue + $lostValue,
            ],
        ];
    }

    /**
     * Full snapshot — used by GET /api/v1/analytics/dashboard.
     * Structure matches TypeScript DashboardData interface exactly.
     */
    public function getDashboardSnapshot(array $filters = []): array
    {
        return [
            // Required by TypeScript DashboardData interface:
            'overview' => $this->getOverviewMetrics($filters),
            'leads_by_status' => $this->getLeadsByStatus($filters),
            'leads_by_source' => $this->getLeadsBySource($filters),
            'pipeline_by_stage' => $this->getPipelineByStage($filters),
            'conversion_funnel' => $this->getConversionFunnel($filters),
            'lead_velocity' => $this->getLeadVelocity($filters),
            'win_loss' => $this->getWinLossAnalysis($filters),
            // Extra data (not in DashboardData TS interface, but used by other views):
            'leads_over_time' => $this->getLeadsOverTime($filters),
            'activity_stats' => $this->getActivityStats($filters),
            'team_performance' => $this->getTeamPerformance($filters),
        ];
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function calcConversionRate($query): float
    {
        $total = (clone $query)->count();
        $converted = (clone $query)->whereNotNull('converted_to_opportunity_at')->count();

        return $total > 0 ? round($converted / $total * 100, 1) : 0;
    }
}
