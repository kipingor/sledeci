<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\TaskUpdated;
use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    protected TaskService $service;

    public function __construct(TaskService $service)
    {
        $this->service = $service;
    }

    // ── Task CRUD ─────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Task::class);

        $data = $request->validate([
            'project_id'      => 'required|integer|exists:projects,id',
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'assigned_to'     => 'nullable|exists:users,id',
            'priority'        => 'nullable|in:low,medium,high',
            'status'          => 'nullable|in:todo,in_progress,review,done',
            'startAt'         => 'nullable|date',
            'endAt'           => 'nullable|date',
            'estimated_hours' => 'nullable|integer',
            'group'           => 'nullable|string|max:255',
        ]);

        $task = $this->service->create($data);
        $task->load('assignee:id,name,email,avatar');

        return response()->json(['ok' => true, 'task' => $task]);
    }

    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $tasks = $project->tasks()->with('assignee:id,name')->get();

        return response()->json($tasks);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'nullable|string|max:255',
            'description'     => 'nullable|string',
            'status'          => 'nullable|in:todo,in_progress,review,done',
            'priority'        => 'nullable|in:low,medium,high',
            'assigned_to'     => 'nullable|exists:users,id',
            'startAt'         => 'nullable|date',
            'endAt'           => 'nullable|date',
            'estimated_hours' => 'nullable|integer',
            'spent_hours'     => 'nullable|integer',
            'group'           => 'nullable|string|max:255',
            'delay_reason'    => 'nullable|string',
            'mitigation'      => 'nullable|string',
        ]);

        $this->authorize('update', $task);

        $task = $this->service->update($task, $data);
        $task->load('assignee:id,name,email,avatar');

        return response()->json(['ok' => true, 'task' => $task]);
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $this->service->delete($task);

        return response()->json(['ok' => true]);
    }

    // ── Task Comments ─────────────────────────────────────────────────────

    /** GET /api/v1/tasks/{task}/comments */
    public function comments(Task $task): JsonResponse
    {
        $comments = $task->comments()->with('user:id,name,avatar')->get();

        return response()->json($comments);
    }

    /** POST /api/v1/tasks/{task}/comments  body: { body, type? } */
    public function addComment(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'body' => 'required|string',
            'type' => 'nullable|in:comment,note,mitigation',
        ]);

        $comment = Comment::create([
            'user_id'          => $request->user()->id,
            'commentable_type' => Task::class,
            'commentable_id'   => $task->id,
            'body'             => $data['body'],
            'type'             => $data['type'] ?? 'comment',
        ]);

        $comment->load('user:id,name,avatar');

        // Mirror mitigations into the task field for reporting
        if (($data['type'] ?? '') === 'mitigation') {
            $task->update(['mitigation' => $data['body']]);
        }

        return response()->json(['ok' => true, 'comment' => $comment], 201);
    }

    /** DELETE /api/v1/tasks/{task}/comments/{comment} */
    public function deleteComment(Task $task, Comment $comment): JsonResponse
    {
        if ($comment->commentable_type !== Task::class || $comment->commentable_id !== $task->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $comment->delete();

        return response()->json(['ok' => true]);
    }
}
