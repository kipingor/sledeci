<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    /**
     * Get all tasks for a project
     */
    public function getTasks(Project $project): JsonResponse
    {
        $tasks = $project->tasks()
            ->with([
                'assignee:id,name,email,avatar',
                'milestone:id,title',
                'comments.user:id,name,avatar',
            ])
            ->orderBy('status')
            ->orderBy('priority', 'desc')
            ->get();

        return response()->json($tasks);
    }

    /**
     * Mark a project as complete (or reopen it)
     */
    public function completeProject(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['completed', 'active', 'on_hold'])],
        ]);

        $project->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => $validated['status'] === 'completed'
                ? 'Project marked as complete.'
                : 'Project reopened.',
            'data'    => $project->fresh(),
        ]);
    }

    /**
     * Create a new task
     */
    public function createTask(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'milestone_id' => ['nullable', Rule::exists('milestones', 'id')],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')],
            'priority' => ['required', Rule::in(['low', 'medium', 'high'])],
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'startAt' => ['nullable', 'date'],
            'endAt' => ['nullable', 'date', 'after_or_equal:startAt'],
            'estimated_hours' => ['nullable', 'integer', 'min:0'],
            'group' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $task = $project->tasks()->create($validated);
            $task->load('assignee:id,name,email,avatar', 'milestone:id,title');

            return response()->json([
                'success' => true,
                'message' => 'Task created successfully',
                'data' => $task,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Task creation failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create task',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a task
     */
    public function updateTask(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task->project);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'milestone_id' => ['nullable', Rule::exists('milestones', 'id')],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'status' => ['sometimes', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'startAt' => ['nullable', 'date'],
            'endAt' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'integer', 'min:0'],
            'spent_hours' => ['nullable', 'integer', 'min:0'],
            'group' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            // FIX: sync completed_at when status is included in the update payload
            if (isset($validated['status'])) {
                if ($validated['status'] === 'done') {
                    $validated['completed_at'] = $task->completed_at ?? now()->toDateString();
                } else {
                    $validated['completed_at'] = null;
                }
            }

            $task->update($validated);
            $task->refresh();
            $task->load('assignee:id,name,email,avatar', 'milestone:id,title');

            return response()->json([
                'success' => true,
                'message' => 'Task updated successfully',
                'data' => $task,
            ]);
        } catch (\Exception $e) {
            Log::error('Task update failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update task',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Move task to a different status (for kanban drag-and-drop)
     */
    public function moveTask(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task->project);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'order' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            // FIX: sync completed_at with status so calculateProgress() counts correctly.
            // calculateProgress uses whereNotNull('completed_at') — without this,
            // tasks dragged to 'done' were never counted as complete.
            $updateData = ['status' => $validated['status']];
            if ($validated['status'] === 'done') {
                $updateData['completed_at'] = $task->completed_at ?? now()->toDateString();
            } else {
                $updateData['completed_at'] = null;
            }

            $task->update($updateData);
            $task->refresh();
            $task->load('assignee:id,name,email,avatar');

            return response()->json([
                'success' => true,
                'message' => 'Task moved successfully',
                'data' => $task,
            ]);
        } catch (\Exception $e) {
            Log::error('Task move failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to move task',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a task
     */
    public function deleteTask(Task $task): JsonResponse
    {
        $this->authorize('update', $task->project);

        try {
            $task->delete();

            return response()->json([
                'success' => true,
                'message' => 'Task deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Task deletion failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete task',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get project statistics
     */
    public function getStatistics(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $stats = [
            'tasks' => [
                'total' => $project->tasks()->count(),
                'todo' => $project->tasks()->where('status', 'todo')->count(),
                'in_progress' => $project->tasks()->where('status', 'in_progress')->count(),
                'review' => $project->tasks()->where('status', 'review')->count(),
                'done' => $project->tasks()->where('status', 'done')->count(),
            ],
            'milestones' => [
                'total' => $project->milestones()->count(),
                'pending' => $project->milestones()->where('status', 'pending')->count(),
                'achieved' => $project->milestones()->where('status', 'achieved')->count(),
            ],
            'team' => [
                'size' => $project->teamMembers()->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Bulk update tasks
     */
    public function bulkUpdateTasks(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'task_ids' => ['required', 'array'],
            'task_ids.*' => ['integer', Rule::exists('tasks', 'id')],
            'updates' => ['required', 'array'],
            'updates.status' => ['sometimes', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'updates.priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'updates.assigned_to' => ['sometimes', 'nullable', Rule::exists('users', 'id')],
        ]);

        try {
            DB::beginTransaction();

            $updated = Task::whereIn('id', $validated['task_ids'])
                ->where('project_id', $project->id)
                ->update($validated['updates']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$updated} tasks updated successfully",
                'data' => ['updated_count' => $updated],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk task update failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update tasks',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
