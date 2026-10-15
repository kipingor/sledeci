<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Task;
use App\Http\Resources\ProjectTaskResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * FIX: update() used $request->all() — mass-assignment risk, no validation.
 *
 * NOTE: ProjectTask (Pivot) has been removed. This controller now operates
 * on the Task model directly (tasks table has project_id FK).
 * Update routes/api.php to bind Task instead of ProjectTask if needed.
 */
class ProjectTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = Task::with(['project:id,name', 'assignee:id,name,avatar'])
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('status'),     fn ($q) => $q->where('status', $request->status))
            ->paginate(20);

        return response()->json(ProjectTaskResource::collection($tasks));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id'       => ['required', 'exists:projects,id'],
            'title'            => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'assigned_to'      => ['nullable', 'exists:users,id'],
            'priority'         => ['nullable', 'string', 'in:low,medium,high,critical'],
            'status'           => ['nullable', 'string'],
            'estimated_hours'  => ['nullable', 'numeric', 'min:0'],
            'due_date'         => ['nullable', 'date'],
            'wbs_code'         => ['nullable', 'string', 'max:50'],
            'parent_id'        => ['nullable', 'exists:tasks,id'],
        ]);

        return response()->json(new ProjectTaskResource(Task::create($data)), 201);
    }

    public function show(Task $task): JsonResponse
    {
        return response()->json(
            new ProjectTaskResource($task->load(['project:id,name', 'assignee:id,name,avatar', 'children']))
        );
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        // FIX: was $request->all() — no validation, mass-assignment risk
        $task->update($request->validate([
            'title'           => ['sometimes', 'string', 'max:255'],
            'description'     => ['nullable', 'string'],
            'assigned_to'     => ['nullable', 'exists:users,id'],
            'priority'        => ['nullable', 'string', 'in:low,medium,high,critical'],
            'status'          => ['nullable', 'string'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'spent_hours'     => ['nullable', 'numeric', 'min:0'],
            'due_date'        => ['nullable', 'date'],
            'completed_at'    => ['nullable', 'date'],
            'wbs_code'        => ['nullable', 'string', 'max:50'],
            'sort_order'      => ['nullable', 'integer'],
            'delay_reason'    => ['nullable', 'string'],
            'mitigation'      => ['nullable', 'string'],
        ]));

        return response()->json(new ProjectTaskResource($task->fresh()));
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
        return response()->json(null, 204);
    }
}