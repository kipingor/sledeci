<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Enums\LeadStatus;
use App\Events\LeadCreated;
use App\Events\LeadUpdated;
use App\Events\LeadDeleted;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LeadService
{
    /**
     * Get paginated list of leads with filters and eager loading
     * ✅ FIXED: Now uses Lead::indexQuery() to prevent N+1 queries
     */
    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        // Start with eager loaded query
        $query = Lead::with(['owner', 'pipelineStage']);

        // Apply filters
        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        if (!empty($filters['pipeline_stage_id'])) {
            $query->where('pipeline_stage_id', $filters['pipeline_stage_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['search'])) {
            $searchTerm = $filters['search'];
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('description', 'like', "%{$searchTerm}%");
            });
        }

        // Default ordering
        $query->orderBy('created_at', 'desc');

        return $query->paginate($perPage);
    }

    /**
     * Create a new lead
     */
    public function create(array $data): Lead
    {
        $lead = Lead::create($data);

        // Fire event
        event(new LeadCreated($lead));

        // Reload with relationships
        return $lead->load(['owner', 'pipelineStage']);
    }

    /**
     * Update an existing lead
     */
    public function update(Lead $lead, array $data): Lead
    {
        $lead->update($data);

        // Fire event
        event(new LeadUpdated($lead));

        // Reload with relationships
        return $lead->fresh(['owner', 'pipelineStage']);
    }

    /**
     * Delete a lead
     */
    public function delete(Lead $lead): bool
    {
        $deleted = $lead->delete();

        if ($deleted) {
            event(new LeadDeleted($lead));
        }

        return $deleted;
    }

    /**
     * Restore a soft-deleted lead
     */
    public function restore(Lead $lead): Lead
    {
        $lead->restore();

        return $lead->fresh(['owner', 'pipelineStage']);
    }

    /**
     * Bulk create leads
     */
    public function bulkCreate(array $leadsData): Collection
    {
        $leads = collect();

        DB::transaction(function () use ($leadsData, &$leads) {
            foreach ($leadsData as $data) {
                $lead = Lead::create($data);
                event(new LeadCreated($lead));
                $leads->push($lead);
            }
        });

        // Reload with relationships
        $leadIds = $leads->pluck('id');
        return Lead::with(['owner', 'pipelineStage'])
            ->whereIn('id', $leadIds)
            ->get();
    }

    /**
     * Bulk update leads
     */
    public function bulkUpdate(array $updates): Collection
    {
        $leads = collect();

        DB::transaction(function () use ($updates, &$leads) {
            foreach ($updates as $update) {
                $lead = Lead::findOrFail($update['id']);
                $lead->update($update['data']);
                event(new LeadUpdated($lead));
                $leads->push($lead);
            }
        });

        // Reload with relationships
        $leadIds = $leads->pluck('id');
        return Lead::with(['owner', 'pipelineStage'])
            ->whereIn('id', $leadIds)
            ->get();
    }

    /**
     * Bulk delete leads
     */
    public function bulkDelete(array $leadIds): int
    {
        $leads = Lead::whereIn('id', $leadIds)->get();

        $count = 0;
        DB::transaction(function () use ($leads, &$count) {
            foreach ($leads as $lead) {
                if ($lead->delete()) {
                    event(new LeadDeleted($lead));
                    $count++;
                }
            }
        });

        return $count;
    }

/**
     * Get comprehensive lead statistics
     * ✅ NEW: Added for dashboard metrics
     */
    public function getStatistics(): array
    {
        $statusCounts = $this->getStatusCounts();
        $total = array_sum($statusCounts);
        
        $wonCount = $statusCounts['won'] ?? 0;
        $lostCount = $statusCounts['lost'] ?? 0;
        $closedTotal = $wonCount + $lostCount;

        return [
            'total' => $total,
            'status' => $statusCounts,
            'conversion_rate' => $closedTotal > 0 
                ? round(($wonCount / $closedTotal) * 100, 2) 
                : 0,
            'active_count' => ($statusCounts['new'] ?? 0) + 
                             ($statusCounts['contacted'] ?? 0) + 
                             ($statusCounts['qualified'] ?? 0),
            'won_count' => $wonCount,
            'lost_count' => $lostCount,
        ];
    }

    /**
     * Get lead statistics
     */
    public function getStatusCounts(): array
    {
        return Lead::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
    }

    /**
     * Get stage statistics
     */
    public function getStageCounts(): array
    {
        return Lead::select('pipeline_stage_id', DB::raw('count(*) as count'))
            ->groupBy('pipeline_stage_id')
            ->with('pipelineStage:id,name')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->pipelineStage?->name ?? 'Unknown' => $item->count];
            })
            ->toArray();
    }

    /**
     * Get recently created leads
     */
    public function getRecent(int $limit = 10): Collection
    {
        return Lead::indexQuery()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get leads by owner
     */
    public function getByOwner(int $ownerId, int $perPage = 15): LengthAwarePaginator
    {
        return Lead::indexQuery()
            ->where('owner_id', $ownerId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get leads by status
     */
    public function getByStatus(LeadStatus $status, int $perPage = 15): LengthAwarePaginator
    {
        return Lead::indexQuery()
            ->where('status', $status)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Search leads
     */
    public function search(string $query, int $perPage = 15): LengthAwarePaginator
    {
        return Lead::indexQuery()
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                  ->orWhere('description', 'like', "%{$query}%");
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get leads created in a date range
     * ✅ NEW: Added for metrics
     */
    public function getCreatedBetween(\DateTime $startDate, \DateTime $endDate): int
    {
        return Lead::whereBetween('created_at', [$startDate, $endDate])->count();
    }

    /**
     * Get average lead response time (creation to first contact)
     * ✅ NEW: Added for metrics
     */
    public function getAverageResponseTime(): float
    {
        $contactedLeads = Lead::whereNotNull('contacted_at')
            ->select('created_at', 'contacted_at')
            ->get();

        if ($contactedLeads->isEmpty()) {
            return 0;
        }

        $totalHours = $contactedLeads->sum(function ($lead) {
            return $lead->created_at->diffInHours($lead->contacted_at);
        });

        return round($totalHours / $contactedLeads->count(), 2);
    }

    /**
     * Get leads by priority (if priority field exists)
     * ✅ NEW: Added for metrics
     */
    public function getPriorityCounts(): array
    {
        try {
            return Lead::select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->pluck('count', 'priority')
                ->toArray();
        } catch (\Exception $e) {
            // Priority column doesn't exist
            return [];
        }
    }

    public function transition(string $newStatus, Lead $lead): Lead
    {
        $validStatuses = ['new', 'contacted', 'qualified', 'won', 'lost'];
        if (!in_array($newStatus, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: {$newStatus}");
        }

        $lead->update(['status' => $newStatus]);

        event(new LeadUpdated($lead));

        return $lead->fresh(['owner', 'pipelineStage']);
    }
}