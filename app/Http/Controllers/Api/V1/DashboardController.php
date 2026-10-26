<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Dashboard\DashboardMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardMetricsService $metricsService
    ) {}

    /**
     * Get comprehensive dashboard metrics
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function metrics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $data = $this->metricsService->getOverview(
            userId: $request->integer('user_id'),
            useCache: $request->boolean('cache', true)
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get activity metrics
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function activities(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $validated = $request->validate([
            'period' => 'sometimes|in:week,month,quarter,year',
        ]);

        $data = $this->metricsService->getActivityMetrics(
            period: $validated['period'] ?? 'week'
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get performance metrics
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function performance(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $data = $this->metricsService->getTeamPerformance();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get recent activities
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function recentActivities(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $validated = $request->validate([
            'limit' => 'sometimes|integer|min:1|max:100',
        ]);

        $activities = $this->metricsService->getActivityMetrics(
            period: 'week'
        );
        
        return response()->json([
            'success' => true,
            'data' => $activities,
        ]);
    }

    /**
     * Get top performing users
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function topPerformers(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $validated = $request->validate([
            'limit' => 'sometimes|integer|min:1|max:50',
            'period' => 'sometimes|in:week,month,quarter,year',
        ]);

        $performers = $this->metricsService->getTopPerformers(
            limit: $validated['limit'] ?? 10,
            period: $validated['period'] ?? 'month'
        );

        return response()->json([
            'success' => true,
            'data' => $performers,
            'period' => $validated['period'] ?? 'month',
        ]);
    }

    /**
     * Get leads chart data
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function leadsChart(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $validated = $request->validate([
            'days' => 'sometimes|integer|min:1|max:365',
        ]);

        $data = $this->metricsService->getLeadsChartData(
            days: $validated['days'] ?? 30
        );

        return response()->json([
            'success' => true,
            'data' => $data['data'],
            'period' => $data['period'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
        ]);
    }

    /**
     * Get conversion funnel data
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function conversionFunnel(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $data = $this->metricsService->getConversionFunnel();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Clear dashboard cache
     * 
     * Admin only endpoint to refresh dashboard data
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function clearCache(Request $request): JsonResponse
    {
        // Only admins can clear cache
        $this->authorize('admin', $request->user());

        $this->metricsService->clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Dashboard cache cleared successfully',
        ]);
    }
}