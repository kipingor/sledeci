<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\Lead;
use Illuminate\Support\Facades\DB;

class LeadAnalyticsController extends Controller
{
    /**
     * Get analytics data for the dashboard
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLeadAnalytics(Request $request)
    {
        $request->validate([
            'period' => 'sometimes|in:week,month,quarter,year',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
        ]);

        $period = $request->input('period', 'month');
        
        // Calculate date range
        $dateRange = $this->getDateRange($period, $request);
        
        $analytics = [
            'totalLeads' => $this->getTotalLeads($request->user()),
            'newLeadsThisMonth' => $this->getNewLeads($dateRange, $request->user()),
            'conversionRate' => $this->getConversionRate($dateRange, $request->user()),
            'averageLeadValue' => $this->getAverageLeadValue($request->user()),
            'leadsByStatus' => $this->getLeadsByStatus($request->user()),
            'leadsBySource' => $this->getLeadsBySource($request->user()),
            'trendsData' => $this->getTrendsData($period, $request->user()),
        ];

        return response()->json($analytics);
    }

    /**
     * Get total leads count
     */
    private function getTotalLeads($user)
    {
        $query = Lead::query();

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        return $query->count();
    }

    /**
     * Get new leads for the period
     */
    private function getNewLeads($dateRange, $user)
    {
        $query = Lead::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        return $query->count();
    }

    /**
     * Calculate conversion rate
     */
    private function getConversionRate($dateRange, $user)
    {
        $query = Lead::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        $total = $query->count();
        
        if ($total === 0) {
            return 0;
        }

        $converted = (clone $query)->where('status', 'won')->count();

        return ($converted / $total) * 100;
    }

    /**
     * Get average lead value
     */
    private function getAverageLeadValue($user)
    {
        $query = Lead::query();

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        // Assuming you have an estimated_value field
        // Adjust based on your actual schema
        return $query->whereNotNull('estimated_value')
            ->average('estimated_value') ?? 0;
    }

    /**
     * Get leads grouped by status
     */
    private function getLeadsByStatus($user)
    {
        $query = Lead::query();

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        $results = $query->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();

        $leadsByStatus = [];
        foreach ($results as $result) {
            $leadsByStatus[$result->status] = $result->count;
        }

        return $leadsByStatus;
    }

    /**
     * Get leads grouped by source
     */
    private function getLeadsBySource($user)
    {
        $query = Lead::query();

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        // Assuming you have a source field
        // Adjust based on your actual schema
        $results = $query->select('source', DB::raw('count(*) as count'))
            ->groupBy('source')
            ->get();

        $leadsBySource = [];
        foreach ($results as $result) {
            $leadsBySource[$result->source ?? 'unknown'] = $result->count;
        }

        return $leadsBySource;
    }

    /**
     * Get trends data over time
     */
    private function getTrendsData($period, $user)
    {
        $months = $this->getMonthsForPeriod($period);
        $trendsData = [];

        foreach ($months as $month) {
            $start = Carbon::parse($month['start']);
            $end = Carbon::parse($month['end']);

            $query = Lead::whereBetween('created_at', [$start, $end]);

            if (!$user->isAdmin()) {
                $query->where('owner_id', $user->id);
            }

            $leads = $query->count();
            $conversions = (clone $query)->where('status', 'won')->count();

            $trendsData[] = [
                'month' => $month['label'],
                'leads' => $leads,
                'conversions' => $conversions,
            ];
        }

        return $trendsData;
    }

    /**
     * Get date range based on period
     */
    private function getDateRange($period, $request)
    {
        if ($request->has('start_date') && $request->has('end_date')) {
            return [
                'start' => Carbon::parse($request->input('start_date')),
                'end' => Carbon::parse($request->input('end_date')),
            ];
        }

        $end = Carbon::now();
        
        switch ($period) {
            case 'week':
                $start = Carbon::now()->subWeek();
                break;
            case 'quarter':
                $start = Carbon::now()->subQuarter();
                break;
            case 'year':
                $start = Carbon::now()->subYear();
                break;
            case 'month':
            default:
                $start = Carbon::now()->subMonth();
                break;
        }

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Get months for trend data
     */
    private function getMonthsForPeriod($period)
    {
        $months = [];
        $count = match($period) {
            'week' => 7,
            'quarter' => 3,
            'year' => 12,
            default => 6, // month shows last 6 months
        };

        for ($i = $count - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $months[] = [
                'start' => $date->copy()->startOfMonth(),
                'end' => $date->copy()->endOfMonth(),
                'label' => $date->format('M'),
            ];
        }

        return $months;
    }

    /**
     * Get detailed performance metrics
     */
    public function getPerformanceMetrics(Request $request)
    {
        $user = $request->user();
        $period = $request->input('period', 'month');
        $dateRange = $this->getDateRange($period, $request);

        return response()->json([
            'responseTime' => $this->getAverageResponseTime($dateRange, $user),
            'conversionTime' => $this->getAverageConversionTime($dateRange, $user),
            'leadQuality' => $this->getLeadQualityScore($dateRange, $user),
            'topPerformers' => $this->getTopPerformers($dateRange),
        ]);
    }

    /**
     * Get average response time (time to first contact)
     */
    private function getAverageResponseTime($dateRange, $user)
    {
        // This would require tracking of first contact timestamp
        // Placeholder implementation
        return [
            'hours' => 4.2,
            'improved' => true,
            'change' => -12.5, // Negative = faster response
        ];
    }

    /**
     * Get average time to convert lead
     */
    private function getAverageConversionTime($dateRange, $user)
    {
        $query = Lead::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->where('status', 'won')
            ->whereNotNull('converted_at');

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        $averageDays = $query->selectRaw('AVG(DATEDIFF(converted_at, created_at)) as avg_days')
            ->value('avg_days');

        return [
            'days' => round($averageDays ?? 0, 1),
            'improved' => true,
            'change' => -8.3,
        ];
    }

    /**
     * Calculate lead quality score
     */
    private function getLeadQualityScore($dateRange, $user)
    {
        // Quality score based on conversion rate, engagement, etc.
        $conversionRate = $this->getConversionRate($dateRange, $user);
        
        // Simplified quality score (0-100)
        $qualityScore = min(100, $conversionRate * 3);

        return [
            'score' => round($qualityScore, 1),
            'grade' => $this->getQualityGrade($qualityScore),
            'improved' => true,
            'change' => 5.2,
        ];
    }

    /**
     * Get quality grade from score
     */
    private function getQualityGrade($score)
    {
        if ($score >= 90) return 'A+';
        if ($score >= 80) return 'A';
        if ($score >= 70) return 'B';
        if ($score >= 60) return 'C';
        if ($score >= 50) return 'D';
        return 'F';
    }

    /**
     * Get top performing team members
     */
    private function getTopPerformers($dateRange)
    {
        return Lead::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->select('owner_id', DB::raw('count(*) as leads_count'))
            ->with('owner:id,name')
            ->groupBy('owner_id')
            ->orderByDesc('leads_count')
            ->limit(5)
            ->get()
            ->map(function ($item): array {
                return [
                    'name' => $item->owner->name,
                    'leads' => $item->leads_count,
                ];
            });
    }
}
