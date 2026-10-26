<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardAnalyticsController extends Controller
{
    public function __construct(
        protected DashboardMetricsService $dashboardService,
    ) {}

    // ── Existing methods (unchanged) ──────────────────────────────────────────

    public function overview(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getOverviewMetrics($request->only(['date_from', 'date_to', 'owner_id'])),
        ]);
    }

    public function leadsByStatus(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getLeadsByStatus($request->all()),
        ]);
    }

    // BUG FIX: route was 'pipeline-by-stage' → action 'pipelineByStage', but method was 'pipeline'
    public function pipelineByStage(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getPipelineByStage($request->all()),
        ]);
    }

    public function leadsOverTime(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getLeadsOverTime($request->all()),
        ]);
    }

    public function conversionFunnel(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getConversionFunnel($request->all()),
        ]);
    }

    public function teamPerformance(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getTeamPerformance($request->all()),
        ]);
    }

    // ── BUG FIX: all methods below were MISSING — routes existed, methods did not ──

    /** GET /api/v1/analytics/leads-by-source */
    public function leadsBySource(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getLeadsBySource($request->all()),
        ]);
    }

    /** GET /api/v1/analytics/activity-stats */
    public function activityStats(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getActivityStats($request->all()),
        ]);
    }

    /** GET /api/v1/analytics/lead-velocity */
    public function leadVelocity(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getLeadVelocity($request->all()),
        ]);
    }

    /** GET /api/v1/analytics/win-loss-analysis */
    public function winLossAnalysis(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getWinLossAnalysis($request->all()),
        ]);
    }

    /**
     * GET /api/v1/analytics/dashboard
     * Single endpoint that returns ALL dashboard data — used by the Dashboard component.
     * BUG FIX: this route existed but the method was completely missing.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'owner_id']);

        return response()->json([
            'success' => true,
            'data'    => $this->dashboardService->getDashboardSnapshot($filters),
        ]);
    }
}