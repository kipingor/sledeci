<?php

namespace App\Services\Pipeline;

use App\Models\Lead;
use App\Models\User;
use App\Models\PipelineStage;
use App\Events\LeadMoved;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class PipelineService
{
    /**
     * Move lead to a specific stage
     */
    public function moveToStage(Lead $lead, string $stage, User $user)
    {
        $stageModel = PipelineStage::where('key', $stage)->firstOrFail();
        return $this->moveLead($lead, $stageModel->id);
    }

    /**
     * Get all pipeline stages with lead counts
     */
    public function getStagesWithLeads(): Collection
    {
        return PipelineStage::withCount('leads')
            ->orderBy('order', 'asc')
            ->get();
    }

    /**
     * Get leads grouped by pipeline stage
     */
    public function getLeadsByStage(): Collection
    {
        return PipelineStage::with([
            'leads' => fn ($q) => $q
                ->orderBy('order')
                ->with([
                    'owner',
                    'opportunity:id,lead_id,estimated_value'
                ])
        ])
            ->orderBy('order')
            ->get();
    }

    public function getPipelineBoard(): array
    {
        return PipelineStage::query()
            ->orderBy('order')
            ->with([
                'leads' => function ($q) {
                    $q->orderBy('order')
                        ->with(['owner:id,name,avatar']);
                }
            ])
            ->get()
            ->map(fn ($stage) => [
                'id' => $stage->id,
                'name' => $stage->name,
                'key' => $stage->key,
                'color' => $stage->color ?? '#6b7280',
                'leads' => $stage->leads->map(fn ($lead) => [
                    'id' => $lead->id,
                    'title' => $lead->title,
                    'status' => $lead->status,
                    'pipeline_stage_id' => $lead->pipeline_stage_id,
                    'created_at' => $lead->created_at,
                    'owner' => [
                        'name' => $lead->owner->name ?? 'Unassigned',
                        'avatar' => $lead->owner->avatar ?? null,
                    ],
                ])->values(),
            ])
            ->values()
            ->toArray();
    }

    public function getPipelineMetrics(): array
    {
        return [
            'totalLeads' => Lead::count(),
            'totalValue' => Lead::whereHas('opportunity')
                ->with('opportunity')
                ->get()
                ->sum(fn ($lead) => $lead->opportunity->estimated_value ?? 0),
            'conversionRate' => $this->calculateConversionRate(),
        ];
    }

    /**
     * Move lead to different pipeline stage
     */
    public function moveLead(Lead $lead, string|int $newStageId, int $newOrder = 0): Lead
    {
        return DB::transaction(function () use ($lead, $newStageId, $newOrder) {
            $lead = Lead::lockForUpdate()->findOrFail($lead->id);

            // Convert string to int if needed
            $newStageId = (int) $newStageId;

            $oldStageId = $lead->pipeline_stage_id;
            $oldOrder = $lead->order;

            // Update lead's stage and order
            $lead->update([
                'pipeline_stage_id' => $newStageId,
                'order' => $newOrder,
            ]);

            // Reorder leads in old stage
            $this->reorderStage($oldStageId);

            // Reorder leads in new stage
            if ($oldStageId !== $newStageId) {
                $this->reorderStage($newStageId);
            }

            $old = [
                'pipeline_stage_id' => $oldStageId,
                'order' => $oldOrder
            ];

            // Dispatch event
            event(new LeadMoved($lead, $oldStageId, $newStageId));

            // Log the change
            if (class_exists(\App\Models\AuditLog::class)) {
                try {
                    AuditLog::create([
                        'auditable_type' => Lead::class,
                        'auditable_id' => $lead->id,
                        'user_id' => Auth::id(),
                        'event' => 'pipeline_moved',
                        'old_values' => $old,
                        'new_values' => ['pipeline_stage_id' => $newStageId],
                    ]);
                } catch (\Exception $e) {
                    // Silently fail if audit logging is not available
                }
            }

            return $lead->refresh()->load(['pipelineStage', 'owner']);
        });
    }

    /**
     * Reorder leads within a stage
     */
    public function reorderStage(int $stageId): void
    {
        DB::transaction(function () use ($stageId) {
            $leads = Lead::where('pipeline_stage_id', $stageId)
                ->lockForUpdate()
                ->orderBy('order')
                ->orderBy('created_at')
                ->get(['id', 'order']);

            foreach ($leads as $index => $lead) {
                // Use a direct UPDATE — never upsert, which would trigger
                // NOT NULL constraints on columns absent from the payload.
                DB::table('leads')
                    ->where('id', $lead->id)
                    ->update(['order' => $index, 'updated_at' => now()]);
            }
        });
    }

    /**
     * Update multiple lead orders in a stage
     */
    public function updateLeadOrders(int $stageId, array $leadOrders): void
    {
        DB::transaction(function () use ($stageId, $leadOrders) {
            foreach ($leadOrders as $leadId => $order) {
                Lead::where('id', $leadId)
                    ->where('pipeline_stage_id', $stageId)
                    ->update(['order' => $order]);
            }
        });
    }

    /**
     * Get pipeline analytics
     * ✅ FIXED: Now returns proper structure with all required fields
     */
    public function getAnalytics(): array
    {
        $stages = PipelineStage::withCount('leads')
            ->orderBy('order')
            ->get();

        $totalLeads = Lead::count();

        // Calculate total value from opportunities if available
        $totalValue = 0;
        if (class_exists(\App\Models\Opportunity::class)) {
            try {
                // FIX: Opportunity stage values are 'closed_won'/'closed_lost', not 'won'/'lost'
                $totalValue = \App\Models\Opportunity::whereNotIn('stage', ['closed_won', 'closed_lost'])
                    ->sum('estimated_value') ?? 0;
            } catch (\Exception $e) {
                $totalValue = 0;
            }
        }

        // Calculate total opportunities
        $totalOpportunities = 0;
        if (class_exists(\App\Models\Opportunity::class)) {
            try {
                $totalOpportunities = \App\Models\Opportunity::count();
            } catch (\Exception $e) {
                $totalOpportunities = 0;
            }
        }

        return [
            'stages' => $stages->map(fn ($stage) => [
                'id' => $stage->id,
                'name' => $stage->name,
                'key' => $stage->key ?? strtolower(str_replace(' ', '_', $stage->name)),
                'type' => $stage->type ?? 'default',
                'lead_count' => $stage->leads_count,
                'percentage' => $totalLeads > 0
                    ? round(($stage->leads_count / $totalLeads) * 100, 2)
                    : 0,
            ])->toArray(),
            'total_leads' => $totalLeads,
            'total_value' => $totalValue,
            'total_opportunities' => $totalOpportunities,
            'conversion_rate' => $this->calculateConversionRate(),
            'average_time_in_pipeline' => $this->calculateAverageTimeInPipeline(),
            'status' => $this->getStatusBreakdown(),
        ];
    }

    /**
     * Get status breakdown for analytics
     * ✅ NEW: Added to support dashboard metrics
     */
    private function getStatusBreakdown(): array
    {
        return Lead::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
    }

    /**
     * Calculate conversion rate (won / total closed)
     * ✅ FIXED: Better calculation
     */
    private function calculateConversionRate(): float
    {
        $stats = DB::table('leads')
            ->selectRaw("
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN status IN ('won', 'lost') THEN 1 ELSE 0 END) as closed
            ")
            ->first();

        $won = $stats->won ?? 0;
        $closed = $stats->closed ?? 0;

        return $closed > 0 ? round(($won / $closed) * 100, 2) : 0;
    }

    /**
     * Calculate average time leads spend in pipeline
     */
    private function calculateAverageTimeInPipeline(): float
    {
        // Find won or lost leads
        $closedLeads = Lead::whereIn('status', ['won', 'lost'])
            ->where(function ($q) {
                $q->whereNotNull('won_at')
                    ->orWhereNotNull('lost_at');
            })
            ->get();

        if ($closedLeads->isEmpty()) {
            return 0;
        }

        $totalDays = $closedLeads->sum(function ($lead) {
            $closeDate = $lead->won_at ?? $lead->lost_at ?? $lead->updated_at;
            return $lead->created_at->diffInDays($closeDate);
        });

        return round($totalDays / $closedLeads->count(), 2);
    }

    /**
     * Get pipeline velocity (leads moving forward per week)
     */
    public function getVelocity(): array
    {
        $weekAgo = now()->subWeek();

        // Try to get from activities table if it exists
        $movementsThisWeek = 0;

        if (class_exists(\App\Models\Activity::class)) {
            try {
                $movementsThisWeek = DB::table('activities')
                    ->where('action', 'stage_changed')
                    ->where('created_at', '>=', $weekAgo)
                    ->count();
            } catch (\Exception $e) {
                // Fall back to counting updated leads
                $movementsThisWeek = Lead::where('updated_at', '>=', $weekAgo)
                    ->where('updated_at', '!=', DB::raw('created_at'))
                    ->count();
            }
        } else {
            // Fall back to counting updated leads
            $movementsThisWeek = Lead::where('updated_at', '>=', $weekAgo)
                ->where('updated_at', '!=', DB::raw('created_at'))
                ->count();
        }

        return [
            'movements_this_week' => $movementsThisWeek,
            'average_per_day' => round($movementsThisWeek / 7, 2),
        ];
    }

    /**
     * Get stage by key or ID
     * ✅ NEW: Helper method
     */
    public function getStage(string|int $stageIdentifier): ?PipelineStage
    {
        if (is_numeric($stageIdentifier)) {
            return PipelineStage::find($stageIdentifier);
        }

        return PipelineStage::where('key', $stageIdentifier)->first();
    }
}