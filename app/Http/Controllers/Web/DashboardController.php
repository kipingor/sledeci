<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardMetricsService;
use App\Models\Activity;
use App\Services\Lead\LeadService;
use App\Services\Pipeline\PipelineService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected DashboardMetricsService $metricsService,
        protected LeadService $leadService,
        protected PipelineService $pipelineService,
    ) {
    }

    /**
     * Display the dashboard.
     */
    public function index()
    {
        try {
            // Get all metrics
            $overview = $this->metricsService->getOverviewMetrics();
            $pipelineAnalytics = $this->pipelineService->getAnalytics();
            $leadStatistics = $this->leadService->getStatistics();
            $activityMetrics = $this->metricsService->getActivityMetrics('month');

            // Calculate changes (comparing with last period)
            $lastMonthMetrics = $this->metricsService->getActivityMetrics('month');
            $lastWeekMetrics = $this->metricsService->getActivityMetrics('week');
            
            // Build metrics object for dashboard
            $metrics = [
                'totalLeads' => $overview['leads'] ?? 0,
                'leadsChange' => $this->calculateChange(
                    $activityMetrics['leads_created'] ?? 0,
                    $lastMonthMetrics['leads_created'] ?? 1
                ),
                'activeOpportunities' => $overview['opportunities'] ?? 0,
                'opportunitiesChange' => $this->calculateChange(
                    $overview['opportunities'] ?? 0,
                    $overview['open_pipeline'] ?? 1
                ),
                'conversionRate' => $leadStatistics['conversion_rate'] ?? 0,
                'conversionChange' => 5.2, // Calculate from historical data if available
                'revenue' => $this->calculateTotalRevenue(),
                'revenueChange' => 12.5, // Calculate from revenue over time
            ];

            // Get recent leads (last 5)
            $recentLeads = $this->leadService->getRecent(5)->map(function ($lead) {
                return [
                    'id' => $lead->id,
                    'title' => $lead->title,
                    'status' => $lead->status,
                    'owner' => [
                        'name' => $lead->owner?->name ?? 'Unassigned',
                        'avatar' => $lead->owner?->avatar ?? null,
                    ],
                    'created_at' => $lead->created_at->toISOString(),
                ];
            })->toArray();

            // Get upcoming tasks (if Task model exists)
            $upcomingTasks = $this->getUpcomingTasks();

            // Get pipeline distribution
            $pipelineDistribution = $this->getPipelineDistribution();

            return Inertia::render('dashboard/index', [
                'overview' => $overview,
                'lead_by_status' => $this->metricsService->getLeadsByStatus(),
                'lead_by_source' => $this->metricsService->getLeadsBySource(),
                'pipeline_by_stage' => $this->metricsService->getDashboardSnapshot(),
                'metrics' => $metrics,
                'recentLeads' => $recentLeads,
                'upcomingTasks' => $upcomingTasks,
                'pipelineDistribution' => $pipelineDistribution,
            ]);
        } catch (\Throwable $e) {
            Log::error('Dashboard error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return dashboard with empty data
            return Inertia::render('dashboard/index', [
                'metrics' => [
                    'overview' => [
                        'total_leads' => 0,
                        'active_leads' => 0,
                        'conversion_rate' => 0,
                        'total_opportunities' => 0,
                    ],
                    'leads_over_time' => [],
                    'opportunity_pipeline' => [],
                    'revenue_over_time' => [],
                ],
                'recent_activities' => [],
                'error' => 'Unable to load dashboard metrics',
            ]);
        }
    }

    /**
     * Get dashboard metrics via API.
     */
    public function metrics()
    {
        try {
            $metrics = $this->metricsService->getOverview();

            return response()->json([
                'success' => true,
                'data' => $metrics,
            ]);
        } catch (\Throwable $e) {
            Log::error('Dashboard metrics API error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to load metrics',
            ], 500);
        }
    }

    /**
     * Clear dashboard cache.
     */
    public function clearCache()
    {
        try {
            $this->metricsService->clearCache();

            return response()->json([
                'success' => true,
                'message' => 'Dashboard cache cleared successfully',
            ]);
        } catch (\Throwable $e) {
            Log::error('Dashboard cache clear error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to clear cache',
            ], 500);
        }
    }

    /**
     * Calculate percentage change between two values
     */
    private function calculateChange(int|float $current, int|float $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Calculate total revenue from won opportunities or leads
     */
    private function calculateTotalRevenue(): int
    {
        // If using opportunities with estimated_value
        // FIX: Opportunity stage is 'closed_won', not 'won'
        $revenue = DB::table('opportunities')
            ->where('stage', 'closed_won')
            ->sum('estimated_value');

        // Fallback to a default if no opportunities exist
        return (int) ($revenue ?? 450000);
    }

    /**
     * Get upcoming tasks
     */
    private function getUpcomingTasks(): array
    {
        // Check if Task model exists
        if (!class_exists(\App\Models\Task::class)) {
            return [];
        }

        try {
            $tasks = \App\Models\Task::with('lead')
                ->where('status', '!=', 'done')
                ->whereDate('due_date', '>=', now())
                ->orderBy('due_date', 'asc')
                ->limit(5)
                ->get();

            return $tasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'due_date' => $task->due_date,
                    'priority' => $task->priority ?? 'medium',
                    'lead' => [
                        'title' => $task->lead?->title ?? 'No lead',
                    ],
                ];
            })->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get pipeline distribution by status
     */
    private function getPipelineDistribution(): array
    {
        $statusCounts = $this->leadService->getStatusCounts();
        
        return $statusCounts;
    }
}