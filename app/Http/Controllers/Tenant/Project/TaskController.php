<?php

namespace App\Http\Controllers\Tenant\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreTaskRequest;
use App\Http\Requests\Project\UpdateTaskRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        $tasks = Task::with(['project', 'assignee'])
            ->when($request->input('search'), fn ($query, $search) => $query->where('title', 'ilike', '%' . $search . '%'))
            ->when($request->input('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->input('project_id'), fn ($query, $projectId) => $query->where('project_id', $projectId))
            ->when($request->input('assignee_id'), fn ($query, $assigneeId) => $query->where('assignee_id', $assigneeId))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('tasks/index', [
            'tasks'      => $tasks,
            'statuses'   => Task::STATUSES,
            'priorities' => Task::PRIORITIES,
            'projects'   => Project::select('id', 'name')->orderBy('name')->get(),
            'teamMembers' => User::select('id', 'name')->orderBy('name')->get(),
            'filters'    => $request->only(['search', 'status', 'project_id', 'assignee_id']),
        ]);
    }

    public function create(Project $project): Response
    {
        return Inertia::render('tasks/form', [
            'project'     => $project->only(['id', 'name']),
            'taskStatuses' => Task::STATUSES,
            'priorities'  => Task::PRIORITIES,
            'teamMembers' => User::select('id', 'name')->orderBy('name')->get(),
            'parentTasks' => $project->tasks()->whereNull('parent_task_id')->select('id', 'title')->orderBy('title')->get(),
        ]);
    }

    public function store(StoreTaskRequest $request, Project $project): RedirectResponse
    {
        $data = $request->validated();
        $data['project_id'] = $project->id;
        $data['created_by'] = auth()->id();
        if (($data['status'] ?? null) === 'done') {
            $data['completed_at'] = now();
        }

        Task::create($data);

        return redirect()->route('projects.show', $project)->with('success', 'Task created successfully.');
    }

    public function edit(Task $task): Response
    {
        $task->load('project');

        return Inertia::render('tasks/form', [
            'task'        => $task,
            'project'     => $task->project->only(['id', 'name']),
            'taskStatuses' => Task::STATUSES,
            'priorities'  => Task::PRIORITIES,
            'teamMembers' => User::select('id', 'name')->orderBy('name')->get(),
            'parentTasks' => $task->project->tasks()->whereNull('parent_task_id')->whereKeyNot($task->id)->select('id', 'title')->orderBy('title')->get(),
        ]);
    }

    public function update(UpdateTaskRequest $request, Task $task): RedirectResponse
    {
        $data = $request->validated();
        if (($data['status'] ?? null) === 'done' && $task->completed_at === null) {
            $data['completed_at'] = now();
        } elseif (($data['status'] ?? null) !== 'done') {
            $data['completed_at'] = null;
        }
        $task->update($data);

        return redirect()->route('projects.show', $task->project_id)->with('success', 'Task updated successfully.');
    }

    public function markDone(Task $task): RedirectResponse
    {
        $task->markDone();

        return back()->with('success', 'Task marked as done.');
    }

    public function destroy(Task $task): RedirectResponse
    {
        $projectId = $task->project_id;
        $task->delete();

        return redirect()->route('projects.show', $projectId)->with('success', 'Task deleted.');
    }
}
