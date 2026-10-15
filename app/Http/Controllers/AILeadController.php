<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Services\AILeadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * AI Controller for Lead Intelligence
 * 
 * Endpoints for AI-powered features:
 * - Lead insights
 * - Batch scoring
 * - Recommendations
 */
class AILeadController extends Controller
{
    protected AILeadService $aiService;

    public function __construct(AILeadService $aiService)
    {
        $this->aiService = $aiService;
    }

    /**
     * Get comprehensive AI insights for a lead
     * 
     * @param Lead $lead
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLeadInsights(Lead $lead)
    {
        // Check authorization
        $this->authorize('view', $lead);

        try {
            $insights = $this->aiService->generateInsights($lead);

            return response()->json($insights);
        } catch (\Exception $e) {
            Log::error('Failed to generate lead insights', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to generate insights',
            ], 500);
        }
    }

    /**
     * Batch score multiple leads
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function batchScore(Request $request)
    {
        $request->validate([
            'lead_ids' => 'required|array|max:100',
            'lead_ids.*' => 'required|integer|exists:leads,id',
        ]);

        try {
            $leadIds = $request->input('lead_ids');

            // Filter to only leads the user can access
            $accessibleLeads = Lead::whereIn('id', $leadIds)
                ->where(function ($query) use ($request) {
                    if (!$request->user()->isAdmin()) {
                        $query->where('owner_id', $request->user()->id);
                    }
                })
                ->pluck('id')
                ->toArray();

            $scores = $this->aiService->batchScore($accessibleLeads);

            return response()->json([
                'success' => true,
                'scores' => $scores,
                'processed' => count($scores),
            ]);
        } catch (\Exception $e) {
            Log::error('Batch scoring failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'error' => 'Failed to score leads',
            ], 500);
        }
    }

    /**
     * Get AI recommendations for next actions
     * 
     * @param Lead $lead
     * @return \Illuminate\Http\JsonResponse
     */
    public function getRecommendations(Lead $lead)
    {
        $this->authorize('view', $lead);

        try {
            $insights = $this->aiService->generateInsights($lead);

            return response()->json([
                'recommendations' => $insights['nextBestActions'],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get recommendations', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to get recommendations',
            ], 500);
        }
    }

    /**
     * Find similar leads
     * 
     * @param Lead $lead
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function findSimilar(Lead $lead, Request $request)
    {
        $this->authorize('view', $lead);

        $request->validate([
            'outcome' => 'sometimes|in:won,lost,active',
            'limit' => 'sometimes|integer|min:1|max:20',
        ]);

        try {
            $insights = $this->aiService->generateInsights($lead);

            return response()->json([
                'similar_leads' => $insights['similarLeads'],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to find similar leads', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to find similar leads',
            ], 500);
        }
    }

    /**
     * Get pipeline health score
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPipelineHealth(Request $request)
    {
        try {
            $query = Lead::query();

            if (!$request->user()->isAdmin()) {
                $query->where('owner_id', $request->user()->id);
            }

            $leads = $query->get();

            $totalScore = 0;
            $scoredLeads = 0;

            foreach ($leads as $lead) {
                $score = $this->aiService->calculateLeadScore($lead);
                $totalScore += $score['score'];
                $scoredLeads++;
            }

            $avgScore = $scoredLeads > 0 ? $totalScore / $scoredLeads : 0;

            // Categorize leads by score
            $highQuality = $leads->filter(function ($lead) {
                $score = $this->aiService->calculateLeadScore($lead);
                return $score['score'] >= 80;
            })->count();

            $mediumQuality = $leads->filter(function ($lead) {
                $score = $this->aiService->calculateLeadScore($lead);
                return $score['score'] >= 60 && $score['score'] < 80;
            })->count();

            $lowQuality = $leads->filter(function ($lead) {
                $score = $this->aiService->calculateLeadScore($lead);
                return $score['score'] < 60;
            })->count();

            return response()->json([
                'average_score' => round($avgScore, 1),
                'total_leads' => $scoredLeads,
                'distribution' => [
                    'high_quality' => $highQuality,
                    'medium_quality' => $mediumQuality,
                    'low_quality' => $lowQuality,
                ],
                'health_status' => $this->getHealthStatus($avgScore),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to calculate pipeline health', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return response()->json([
                'error' => 'Failed to calculate pipeline health',
            ], 500);
        }
    }

    /**
     * Get health status label
     */
    private function getHealthStatus(float $avgScore): string
    {
        if ($avgScore >= 80) return 'excellent';
        if ($avgScore >= 70) return 'good';
        if ($avgScore >= 60) return 'fair';
        return 'needs_improvement';
    }

    /**
     * Refresh AI insights for a lead
     * 
     * @param Lead $lead
     * @return \Illuminate\Http\JsonResponse
     */
    public function refreshInsights(Lead $lead)
    {
        $this->authorize('view', $lead);

        try {
            // Clear cache
            Cache::forget("lead_insights_{$lead->id}");

            // Regenerate insights
            $insights = $this->aiService->generateInsights($lead);

            return response()->json([
                'success' => true,
                'insights' => $insights,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to refresh insights', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to refresh insights',
            ], 500);
        }
    }
}