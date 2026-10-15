<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Activity\StoreActivityRequest;
use App\Http\Requests\Activity\UpdateActivityRequest;
use App\Models\Activity;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityController extends Controller
{
    /**
     * Get all activities for a lead
     */
    public function index(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        $query = $lead->activities()->with('user');

        // Filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        // Filter by completed status
        if ($request->has('completed')) {
            if ($request->boolean('completed')) {
                $query->completed();
            } else {
                $query->pending();
            }
        }

        // Filter by scheduled
        if ($request->boolean('scheduled_only')) {
            $query->scheduled();
        }

        // Filter by overdue
        if ($request->boolean('overdue_only')) {
            $query->overdue();
        }

        // Pagination
        $perPage = $request->input('per_page', 20);
        $activities = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $activities->items(),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    /**
     * Store a new activity
     */
    public function store(StoreActivityRequest $request, Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

        $activity = $lead->activities()->create([
            ...$request->validated(),
            'user_id' => Auth::id(),
        ]);

        $activity->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Activity created successfully',
            'data' => $activity,
        ], 201);
    }

    /**
     * Get a specific activity
     */
    public function show(Lead $lead, Activity $activity): JsonResponse
    {
        $this->authorize('view', $lead);

        if ($activity->lead_id !== $lead->id) {
            return response()->json([
                'success' => false,
                'message' => 'Activity does not belong to this lead',
            ], 404);
        }

        $activity->load('user');

        return response()->json([
            'success' => true,
            'data' => $activity,
        ]);
    }

    /**
     * Update an activity
     */
    public function update(UpdateActivityRequest $request, Lead $lead, Activity $activity): JsonResponse
    {
        $this->authorize('update', $lead);

        if ($activity->lead_id !== $lead->id) {
            return response()->json([
                'success' => false,
                'message' => 'Activity does not belong to this lead',
            ], 404);
        }

        $activity->update($request->validated());
        $activity->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Activity updated successfully',
            'data' => $activity,
        ]);
    }

    /**
     * Delete an activity
     */
    public function destroy(Lead $lead, Activity $activity): JsonResponse
    {
        $this->authorize('update', $lead);

        if ($activity->lead_id !== $lead->id) {
            return response()->json([
                'success' => false,
                'message' => 'Activity does not belong to this lead',
            ], 404);
        }

        $activity->delete();

        return response()->json([
            'success' => true,
            'message' => 'Activity deleted successfully',
        ]);
    }

    /**
     * Mark activity as completed
     */
    public function complete(Request $request, Lead $lead, Activity $activity): JsonResponse
    {
        $this->authorize('update', $lead);

        if ($activity->lead_id !== $lead->id) {
            return response()->json([
                'success' => false,
                'message' => 'Activity does not belong to this lead',
            ], 404);
        }

        $request->validate([
            'outcome' => 'nullable|string|max:255',
        ]);

        $activity->markAsCompleted($request->input('outcome'));
        $activity->load('user');

        return response()->json([
            'success' => true,
            'message' => 'Activity marked as completed',
            'data' => $activity,
        ]);
    }

    /**
     * Get activity statistics for a lead
     */
    public function statistics(Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        $stats = [
            'total' => $lead->activities()->count(),
            'completed' => $lead->activities()->completed()->count(),
            'pending' => $lead->activities()->pending()->count(),
            'overdue' => $lead->activities()->overdue()->count(),
            'by_type' => [],
        ];

        // Count by type
        foreach (\App\Enums\ActivityType::cases() as $type) {
            $stats['by_type'][$type->value] = [
                'label' => $type->label(),
                'count' => $lead->activities()->ofType($type)->count(),
                'completed' => $lead->activities()->ofType($type)->completed()->count(),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
