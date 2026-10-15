<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Http\Requests\Lead\UpdateLeadRequest;
use App\Http\Requests\Lead\TransitionLeadStatusRequest;
use App\Models\Lead;
use App\Services\Lead\LeadService;
use App\Services\Lead\LeadStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeadController extends Controller
{
    public function __construct(
        protected LeadService $leadService,
        protected LeadStatusService $leadStatusService
    ) {
    }

    /**
     * Get paginated list of leads with filters
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);


        $filters = $request->only(['owner_id', 'pipeline_stage_id', 'status', 'type', 'search']);
        $leads = $this->leadService->list(
            $filters,
            perPage: $request->input('per_page', 15)
        );

        return response()->json([
            'success' => true,
            'data' => $leads
        ]);
    }

    /**
     * Store a newly created lead.
     */
    public function store(StoreLeadRequest $request): JsonResponse
    {
        $lead = $this->leadService->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Lead created successfully',
            'data' => $lead,
        ], 201);
    }

    /**
     * Display the specified lead.
     */
    public function show(Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        $lead->load(['owner', 'user', 'pipelineStage', 'questions', 'leadDocuments', 'opportunity', 'proposals']);

        return response()->json([
            'success' => true,
            'data' => $lead,
            'meta' => [
                'available_transitions' => $this->leadStatusService->getAvailableTransitions($lead),
                'status_history' => $this->leadStatusService->getStatusHistory($lead),
            ]
        ]);
    }

    /**
     * Update the specified lead.
     */
    public function update(UpdateLeadRequest $request, Lead $lead): JsonResponse
    {
        $data = $this->leadService->update($lead, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Lead updated successfully',
            'data' => $data,
        ]);
    }

    /**
     * Remove the specified lead.
     */
    public function destroy(Lead $lead, Request $request): JsonResponse
    {
        $this->authorize('delete', $lead);

        $this->leadService->delete($lead);

        return response()->json([
            'success' => true,
            'message' => 'Lead deleted successfully',
        ]);
    }

    public function statistics(): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $newThisWeek = Lead::where('created_at', '>=', now()->subWeek())->get('id');
        $newThisMonth = Lead::where('created_at', '>=', now()->subMonth())->get('id');

        return response()->json([
            'success' => true,
            'data' => [
                'total' => Lead::all()->count(),
                'by_status' => $this->leadService->getStatusCounts(),
                'by_stage' => $this->leadService->getStageCounts(),
                'new_this_week' => $newThisWeek->count(),
                'new_this_month' => $newThisMonth->count(),
            ]
        ]);
    }

    /**
     * Restore a soft-deleted lead
     */
    public function restore(int $id): JsonResponse
    {
        $lead = Lead::withTrashed()->findOrFail($id);
        
        $this->authorize('restore', $lead);

        $this->leadService->restore($lead);

        return response()->json([
            'success' => true,
            'message' => 'Lead restored successfully',
            'data' => $lead->refresh(),
        ]);
    }

    /**
     * Bulk create leads
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $this->authorize('create', arguments: Lead::class);

        $validated = $request->validate([
            'leads' => 'required|array|min:1|max:100',
            'leads.*.title' => 'required|string|max:255',
            'leads.*.description' => 'nullable|string',
            'leads.*.type' => 'required|in:document,conversation',
            'leads.*.pipeline_stage_id' => 'nullable|exists:pipeline_stages,id',
        ]);

        $leads = $this->leadService->bulkCreate($validated['leads']);

        return response()->json([
            'success' => true,
            'message' => "Successfully created {$leads->count()} leads",
            'data' => $leads,
        ], 201);
    }

    /**
     * Bulk update leads
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'updates' => 'required|array|min:1|max:100',
            'updates.*.id' => 'required|exists:leads,id',
            'updates.*.data' => 'required|array',
        ]);

        // Authorize each lead for update
        foreach ($validated['updates'] as $update) {
            $lead = Lead::findOrFail($update['id']);
            $this->authorize('update', $lead);
        }

        $leads = $this->leadService->bulkUpdate($validated['updates']);

        return response()->json([
            'success' => true,
            'message' => "Successfully updated {$leads->count()} leads",
            'data' => $leads,
        ]);
    }

    /**
     * Bulk delete leads
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'required|exists:leads,id',
        ]);

        // Authorize each lead for deletion
        foreach ($validated['ids'] as $leadId) {
            $lead = Lead::findOrFail($leadId);
            $this->authorize('delete', $lead);
        }

        $count = $this->leadService->bulkDelete($validated['ids']);

        return response()->json([
            'success' => true,
            'message' => "Successfully deleted {$count} leads",
        ]);
    }

    public function transition(TransitionLeadStatusRequest $request, Lead $lead): JsonResponse
    {
        // Authorization is handled in the request class
        $validated = $request->validated();
        $newStatus = \App\Enums\LeadStatus::from($validated['status']);

        try {
            if ($newStatus === \App\Enums\LeadStatus::LOST && isset($validated['reason'])) {
                $lead = $this->leadStatusService->markAsLost($lead, $validated['reason']);
            } else {
                $lead = $this->leadStatusService->transition($lead, $newStatus);
            }

            return response()->json([
                'success' => true,
                'message' => "Lead status updated to {$newStatus->label()}",
                'data' => $lead->load(['owner', 'pipelineStage']),
            ]);
        } catch (\App\Exceptions\InvalidStatusTransitionException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error' => 'invalid_status_transition',
                'details' => [
                    'current_status' => [
                        'value' => $lead->status->value,
                        'label' => $lead->status->label(),
                    ],
                    'allowed_transitions' => array_map(
                        fn ($status) => [
                            'value' => $status->value,
                            'label' => $status->label(),
                            'color' => $status->color(),
                        ],
                        $lead->status->getAllowedTransitions()
                    ),
                ],
            ], 422);
        }
    }

    /**
     * Toggle starred status for a lead
     */
    public function toggleStar(Lead $lead): \Illuminate\Http\RedirectResponse
    {
        $this->authorize('update', $lead);

        $lead->update(['is_starred' => !$lead->is_starred]);

        return redirect()->back()->with('success', $lead->is_starred ? 'Lead starred' : 'Lead unstarred');
    }

    /**
     * Get available status transitions for a lead
     */
    public function availableTransitions(Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        $availableStatuses = collect(
            $lead->status->getAllowedTransitions()
        )->map(function ($status) {
            return [
                'value' => $status->value,
                'label' => $status->label(),
                'color' => $status->color(),
                'timestamp_field' => $status->timestampField(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $availableStatuses,
        ]);
    }

    /**
     * Bulk delete leads
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'lead_ids' => 'required|array',
            'lead_ids.*' => 'required|integer|exists:leads,id',
        ]);

        $leads = Lead::whereIn('id', $request->lead_ids)->get();
        
        // Check authorization for each lead
        foreach ($leads as $lead) {
            $this->authorize('delete', $lead);
        }

        $count = Lead::whereIn('id', $request->lead_ids)->delete();

        return response()->json([
            'success' => true,
            'message' => "{$count} lead(s) deleted successfully",
            'data' => [
                'deleted_count' => $count,
                'deleted_ids' => $request->lead_ids,
            ],
        ]);
    }

    /**
     * Bulk archive leads
     */
    public function bulkArchive(Request $request): JsonResponse
    {
        $request->validate([
            'lead_ids' => 'required|array',
            'lead_ids.*' => 'required|integer|exists:leads,id',
        ]);

        $leads = Lead::whereIn('id', $request->lead_ids)->get();
        
        // Check authorization for each lead
        foreach ($leads as $lead) {
            $this->authorize('update', $lead);
        }

        $count = Lead::whereIn('id', $request->lead_ids)
            ->update([
                'status' => \App\Enums\LeadStatus::ARCHIVED,
                'archived_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => "{$count} lead(s) archived successfully",
            'data' => [
                'archived_count' => $count,
                'archived_ids' => $request->lead_ids,
            ],
        ]);
    }

    /**
     * Bulk update lead status
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $request->validate([
            'lead_ids' => 'required|array',
            'lead_ids.*' => 'required|integer|exists:leads,id',
            'status' => ['required', Rule::enum(\App\Enums\LeadStatus::class)],
        ]);

        $leads = Lead::whereIn('id', $request->lead_ids)->get();
        
        // Check authorization for each lead
        foreach ($leads as $lead) {
            $this->authorize('update', $lead);
        }

        $newStatus = \App\Enums\LeadStatus::from($request->status);
        
        foreach ($leads as $lead) {
            $this->leadStatusService->transition($lead, $newStatus);
        }

        return response()->json([
            'success' => true,
            'message' => "{$leads->count()} lead(s) updated successfully",
            'data' => [
                'updated_count' => $leads->count(),
                'updated_ids' => $request->lead_ids,
                'new_status' => $newStatus->value,
            ],
        ]);
    }

    /**
     * Bulk assign owner
     */
    public function bulkAssignOwner(Request $request): JsonResponse
    {
        $request->validate([
            'lead_ids' => 'required|array',
            'lead_ids.*' => 'required|integer|exists:leads,id',
            'owner_id' => 'required|integer|exists:users,id',
        ]);

        $leads = Lead::whereIn('id', $request->lead_ids)->get();
        
        // Check authorization for each lead
        foreach ($leads as $lead) {
            $this->authorize('update', $lead);
        }

        $count = Lead::whereIn('id', $request->lead_ids)
            ->update(['owner_id' => $request->owner_id]);

        return response()->json([
            'success' => true,
            'message' => "{$count} lead(s) reassigned successfully",
            'data' => [
                'updated_count' => $count,
                'updated_ids' => $request->lead_ids,
                'new_owner_id' => $request->owner_id,
            ],
        ]);
    }
}
