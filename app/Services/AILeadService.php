<?php

namespace App\Services;

use App\Models\Lead;
use Illuminate\Support\Facades\Cache;

/**
 * AI Service for Lead Intelligence
 * 
 * This service provides AI-powered insights for leads including:
 * - Lead scoring
 * - Next best action recommendations
 * - Risk factor identification
 * - Similar lead matching
 */
class AILeadService
{
    /**
     * Generate comprehensive insights for a lead
     */
    public function generateInsights(Lead $lead): array
    {
        // Cache insights for 1 hour
        return Cache::remember(
            "lead_insights_{$lead->id}",
            3600,
            fn() => $this->computeInsights($lead)
        );
    }

    /**
     * Compute AI insights for a lead
     */
    private function computeInsights(Lead $lead): array
    {
        return [
            'lead_id' => $lead->id,
            'score' => $this->calculateLeadScore($lead),
            'nextBestActions' => $this->getNextBestActions($lead),
            'similarLeads' => $this->findSimilarLeads($lead),
            'riskFactors' => $this->identifyRiskFactors($lead),
            'opportunityInsights' => $this->getOpportunityInsights($lead),
        ];
    }

    /**
     * Calculate lead score (0-100)
     */
    public function calculateLeadScore(Lead $lead): array
    {
        $factors = [];
        $totalScore = 50; // Base score

        // Factor 1: Lead source quality
        $sourceScores = [
            'referral' => 20,
            'website' => 15,
            'social_media' => 10,
            'cold_outreach' => 5,
            'unknown' => 0,
        ];
        $sourceScore = $sourceScores[$lead->source ?? 'unknown'] ?? 0;
        $totalScore += $sourceScore;
        $factors[] = [
            'name' => 'Lead Source',
            'impact' => $sourceScore,
            'value' => ucfirst($lead->source ?? 'Unknown'),
        ];

        // Factor 2: Engagement level
        $engagementScore = $this->calculateEngagementScore($lead);
        $totalScore += $engagementScore;
        $factors[] = [
            'name' => 'Engagement',
            'impact' => $engagementScore,
            'value' => $this->getEngagementLabel($engagementScore),
        ];

        // Factor 3: Company size (if available)
        if ($lead->company_size) {
            $sizeScore = $this->getCompanySizeScore($lead->company_size);
            $totalScore += $sizeScore;
            $factors[] = [
                'name' => 'Company Size',
                'impact' => $sizeScore,
                'value' => $lead->company_size,
            ];
        }

        // Factor 4: Time in pipeline
        $timeScore = $this->getTimeInPipelineScore($lead);
        $totalScore += $timeScore;
        $factors[] = [
            'name' => 'Pipeline Duration',
            'impact' => $timeScore,
            'value' => $lead->created_at->diffForHumans(),
        ];

        // Factor 5: Budget indicator
        if ($lead->estimated_value) {
            $budgetScore = $this->getBudgetScore($lead->estimated_value);
            $totalScore += $budgetScore;
            $factors[] = [
                'name' => 'Deal Size',
                'impact' => $budgetScore,
                'value' => '$' . number_format($lead->estimated_value),
            ];
        }

        // Normalize score to 0-100
        $totalScore = max(0, min(100, $totalScore));

        return [
            'score' => round($totalScore),
            'confidence' => $this->calculateConfidence($lead),
            'factors' => $factors,
            'prediction' => $this->getPrediction($totalScore),
        ];
    }

    /**
     * Calculate engagement score based on activities
     */
    private function calculateEngagementScore(Lead $lead): int
    {
        $score = 0;

        // Email opens
        $emailOpens = $lead->activities()->where('type', 'email_open')->count();
        $score += min(10, $emailOpens * 2);

        // Calls made
        $calls = $lead->activities()->where('type', 'call')->count();
        $score += min(10, $calls * 3);

        // Meetings scheduled
        $meetings = $lead->activities()->where('type', 'meeting')->count();
        $score += min(15, $meetings * 5);

        // Website visits
        $visits = $lead->activities()->where('type', 'website_visit')->count();
        $score += min(5, $visits);

        return $score;
    }

    /**
     * Get next best actions
     */
    private function getNextBestActions(Lead $lead): array
    {
        $actions = [];

        // Action based on status
        if ($lead->status === 'new') {
            $actions[] = [
                'action' => 'Schedule Discovery Call',
                'priority' => 1,
                'reasoning' => 'New leads convert 3x better when contacted within 24 hours',
                'estimated_impact' => 35,
            ];
        }

        // Action based on time since last contact
        $daysSinceContact = $lead->last_contacted_at 
            ? $lead->last_contacted_at->diffInDays(now())
            : 999;

        if ($daysSinceContact > 7) {
            $actions[] = [
                'action' => 'Send Follow-up Email',
                'priority' => 2,
                'reasoning' => 'It\'s been ' . $daysSinceContact . ' days since last contact',
                'estimated_impact' => 25,
            ];
        }

        // Action based on engagement
        $recentEngagement = $lead->activities()
            ->where('created_at', '>', now()->subDays(3))
            ->count();

        if ($recentEngagement > 5) {
            $actions[] = [
                'action' => 'Move to Qualification Stage',
                'priority' => 1,
                'reasoning' => 'High recent engagement indicates strong interest',
                'estimated_impact' => 40,
            ];
        }

        // Action based on similar won leads
        $similarWonLeads = $this->findSimilarLeads($lead, 'won');
        if (count($similarWonLeads) >= 3) {
            $actions[] = [
                'action' => 'Present Proposal',
                'priority' => 1,
                'reasoning' => 'Similar leads typically convert at this stage',
                'estimated_impact' => 45,
            ];
        }

        return collect($actions)
            ->sortBy('priority')
            ->take(3)
            ->values()
            ->toArray();
    }

    /**
     * Find similar leads
     */
    private function findSimilarLeads(Lead $lead, ?string $outcome = null): array
    {
        $query = Lead::where('id', '!=', $lead->id);

        if ($outcome) {
            $query->where('status', $outcome);
        }

        // Find leads with similar characteristics
        $similar = $query
            ->when($lead->source, fn($q) => $q->where('source', $lead->source))
            ->when($lead->company_size, fn($q) => $q->where('company_size', $lead->company_size))
            ->limit(5)
            ->get();

        return $similar->map(function ($item) use ($lead) {
            return [
                'id' => $item->id,
                'title' => $item->title,
                'similarity' => $this->calculateSimilarity($lead, $item),
                'outcome' => $item->status,
            ];
        })->toArray();
    }

    /**
     * Calculate similarity score between two leads
     */
    private function calculateSimilarity(Lead $lead1, Lead $lead2): float
    {
        $score = 0;
        $factors = 0;

        // Compare source
        if ($lead1->source === $lead2->source) {
            $score += 0.3;
        }
        $factors++;

        // Compare company size
        if ($lead1->company_size && $lead2->company_size) {
            if ($lead1->company_size === $lead2->company_size) {
                $score += 0.3;
            }
            $factors++;
        }

        // Compare value range
        if ($lead1->estimated_value && $lead2->estimated_value) {
            $diff = abs($lead1->estimated_value - $lead2->estimated_value);
            $avgValue = ($lead1->estimated_value + $lead2->estimated_value) / 2;
            $similarity = 1 - ($diff / $avgValue);
            $score += $similarity * 0.4;
            $factors++;
        }

        return $factors > 0 ? $score / $factors : 0;
    }

    /**
     * Identify risk factors
     */
    private function identifyRiskFactors(Lead $lead): array
    {
        $risks = [];

        // Risk: Long time in pipeline
        $daysInPipeline = $lead->created_at->diffInDays(now());
        if ($daysInPipeline > 60) {
            $risks[] = [
                'factor' => 'Extended Pipeline Duration',
                'severity' => 'high',
                'mitigation' => 'Schedule urgency call to understand blockers and timeline',
            ];
        }

        // Risk: Low engagement
        $recentActivities = $lead->activities()
            ->where('created_at', '>', now()->subDays(14))
            ->count();

        if ($recentActivities < 2) {
            $risks[] = [
                'factor' => 'Low Engagement',
                'severity' => 'medium',
                'mitigation' => 'Re-engage with personalized value proposition',
            ];
        }

        // Risk: No decision maker contact
        if (!$lead->decision_maker_identified) {
            $risks[] = [
                'factor' => 'Decision Maker Not Identified',
                'severity' => 'high',
                'mitigation' => 'Request introduction to key stakeholders',
            ];
        }

        // Risk: Budget concerns
        if ($lead->budget_concern) {
            $risks[] = [
                'factor' => 'Budget Constraints',
                'severity' => 'medium',
                'mitigation' => 'Present ROI calculator and flexible payment options',
            ];
        }

        return $risks;
    }

    /**
     * Get opportunity insights
     */
    private function getOpportunityInsights(Lead $lead): array
    {
        $insights = [];

        // Insight: Upsell opportunity
        if ($lead->estimated_value && $lead->estimated_value > 50000) {
            $insights[] = [
                'insight' => 'Premium Deal Opportunity',
                'value' => 'Deal size indicates enterprise potential',
                'actionable' => true,
            ];
        }

        // Insight: Cross-sell potential
        $relatedProducts = $this->identifyRelatedProducts($lead);
        if (count($relatedProducts) > 0) {
            $insights[] = [
                'insight' => 'Cross-sell Opportunity',
                'value' => 'Interest shown in ' . implode(', ', $relatedProducts),
                'actionable' => true,
            ];
        }

        // Insight: Timing advantage
        if ($lead->purchase_timeline === 'immediate') {
            $insights[] = [
                'insight' => 'Urgent Need',
                'value' => 'Looking to purchase immediately',
                'actionable' => true,
            ];
        }

        return $insights;
    }

    /**
     * Batch score multiple leads
     */
    public function batchScore(array $leadIds): array
    {
        $results = [];

        foreach ($leadIds as $leadId) {
            $lead = Lead::find($leadId);
            if ($lead) {
                $results[$leadId] = $this->calculateLeadScore($lead);
            }
        }

        return $results;
    }

    /**
     * Helper methods
     */
    private function getEngagementLabel(int $score): string
    {
        if ($score >= 30) return 'High';
        if ($score >= 15) return 'Medium';
        return 'Low';
    }

    private function getCompanySizeScore(string $size): int
    {
        $scores = [
            'enterprise' => 15,
            'large' => 10,
            'medium' => 5,
            'small' => 0,
        ];
        return $scores[strtolower($size)] ?? 0;
    }

    private function getTimeInPipelineScore(Lead $lead): int
    {
        $days = $lead->created_at->diffInDays(now());
        
        // Optimal: 7-30 days
        if ($days >= 7 && $days <= 30) return 10;
        // Too new: 0-7 days
        if ($days < 7) return 5;
        // Getting stale: 30-60 days
        if ($days <= 60) return -5;
        // Very stale: 60+ days
        return -15;
    }

    private function getBudgetScore(float $value): int
    {
        if ($value >= 100000) return 20;
        if ($value >= 50000) return 15;
        if ($value >= 10000) return 10;
        return 5;
    }

    private function calculateConfidence(Lead $lead): float
    {
        // Confidence based on data completeness
        $fields = [
            'source',
            'company_size',
            'estimated_value',
            'last_contacted_at',
        ];

        $filledFields = collect($fields)
            ->filter(fn($field) => !empty($lead->$field))
            ->count();

        return $filledFields / count($fields);
    }

    private function getPrediction(int $score): string
    {
        if ($score >= 80) return 'high';
        if ($score >= 60) return 'medium';
        return 'low';
    }

    private function identifyRelatedProducts(Lead $lead): array
    {
        // Placeholder - implement based on your product catalog
        return [];
    }
}