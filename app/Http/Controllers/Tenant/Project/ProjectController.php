<?php

namespace App\Http\Controllers\Tenant\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $projects = Project::with('owner')
            ->withCount(['tasks', 'tasks as completed_tasks_count' => fn ($query) => $query->where('status', 'done')])
            ->when($request->input('search'), fn ($query, $search) => $query->where(function ($q) use ($search): void {
                $q->where('name', 'ilike', '%' . $search . '%')
                    ->orWhere('code', 'ilike', '%' . $search . '%');
            }))
            ->when($request->input('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->input('owner_id'), fn ($query, $ownerId) => $query->where('owner_id', $ownerId))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Projects/Index', [
            'projects'    => $projects,
            'statuses'    => Project::STATUSES,
            'priorities'  => Project::PRIORITIES,
            'filters'     => $request->only(['search', 'status', 'owner_id']),
            'teamMembers' => User::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Projects/Form', [
            'statuses'    => Project::STATUSES,
            'priorities'  => Project::PRIORITIES,
            'teamMembers' => User::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        Project::create([
            ...$request->validated(),
            'owner_id' => $request->validated('owner_id') ?? auth()->id(),
        ]);

        return redirect()->route('projects.index')->with('success', 'Project created successfully.');
    }

    public function show(Project $project): Response
    {
        $project->load([
            'owner',
            'tasks' => fn ($query) => $query->with('assignee')->orderByRaw("CASE WHEN status = 'done' THEN 1 ELSE 0 END")->orderBy('due_date'),
        ]);

        return Inertia::render('Projects/Show', [
            'project'     => $project,
            'statuses'    => Project::STATUSES,
            'priorities'  => Project::PRIORITIES,
            'taskStatuses' => Task::STATUSES,
            'teamMembers' => User::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function edit(Project $project): Response
    {
        return Inertia::render('Projects/Form', [
            'project'     => $project,
            'statuses'    => Project::STATUSES,
            'priorities'  => Project::PRIORITIES,
            'teamMembers' => User::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update($request->validated());

        return redirect()->route('projects.show', $project)->with('success', 'Project updated successfully.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();

        return redirect()->route('projects.index')->with('success', 'Project deleted.');
    }
}
