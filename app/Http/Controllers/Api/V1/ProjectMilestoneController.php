<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectMilestoneResource;
use App\Models\Milestone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FIX: update() used $request->all() — replaced with validated rules.
 *
 * NOTE: ProjectMilestone (Pivot) has been removed — this controller
 * now operates on the Milestone model directly (which carries project_id).
 * If the API resource binding was previously ProjectMilestone, update
 * routes/api.php to bind Milestone instead.
 */
class ProjectMilestoneController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $milestones = Milestone::with('project:id,name')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->paginate(20);

        return response()->json(ProjectMilestoneResource::collection($milestones));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:pending,in_progress,completed,missed'],
        ]);

        return response()->json(new ProjectMilestoneResource(Milestone::create($data)), 201);
    }

    public function show(Milestone $milestone): JsonResponse
    {
        return response()->json(new ProjectMilestoneResource($milestone->load('project:id,name')));
    }

    public function update(Request $request, Milestone $milestone): JsonResponse
    {
        // FIX: was $request->all()
        $milestone->update($request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:pending,in_progress,completed,missed'],
        ]));

        return response()->json(new ProjectMilestoneResource($milestone->fresh()));
    }

    public function destroy(Milestone $milestone): JsonResponse
    {
        $milestone->delete();

        return response()->json(null, 204);
    }
}
