<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class MilestoneController extends Controller
{
    /**
     * Cross-project milestone overview — all milestones the user can see.
     */
    public function index(Request $request): Response
    {
        $query = Milestone::with('project:id,name,status,owner_id')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('status'),     fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('search'),     fn ($q) => $q->where('title', 'like', "%{$request->search}%"));

        // Order: incomplete first, then by due date ascending
        $query->orderByRaw("FIELD(status,'pending','in_progress','missed','completed')")
              ->orderBy('due_date');

        $milestones = $query->paginate(30)->withQueryString();

        $projects = Project::select('id', 'name')->orderBy('name')->get();

        $counts = Milestone::selectRaw('status, count(*) as cnt')
            ->groupBy('status')
            ->pluck('cnt', 'status');

        return Inertia::render('milestones/index', [
            'milestones' => $milestones,
            'projects'   => $projects,
            'filters'    => $request->only(['project_id', 'status', 'search']),
            'counts'     => $counts,
        ]);
    }

    /**
     * Show the create form for a milestone scoped to a project.
     */
    public function create(Project $project): Response
    {
        $this->authorize('update', $project);

        return Inertia::render('milestones/create', [
            'project' => $project->only('id', 'name'),
        ]);
    }

    /**
     * Store a new milestone against a project.
     */
    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'due_date'       => ['nullable', 'date'],
            'status'         => ['nullable', 'in:pending,in_progress,completed,missed'],
        ]);

        $milestone = $project->milestones()->create($data);

        return redirect()->route('web.projects.show', $project)
            ->with('success', "Milestone \"{$milestone->title}\" added.");
    }

    public function show(Milestone $milestone): Response
    {
        $milestone->load('project:id,name,status');

        return Inertia::render('milestones/show', [
            'milestone' => $milestone,
        ]);
    }

    public function edit(Milestone $milestone): Response
    {
        $this->authorize('update', $milestone->project);

        return Inertia::render('milestones/edit', [
            'milestone' => $milestone->load('project:id,name'),
        ]);
    }

    public function update(Request $request, Milestone $milestone): RedirectResponse
    {
        $this->authorize('update', $milestone->project);

        $data = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'status'         => ['nullable', 'in:pending,in_progress,completed,missed'],
        ]);

        $milestone->update($data);

        return back()->with('success', 'Milestone updated.');
    }

    public function destroy(Milestone $milestone): RedirectResponse
    {
        $this->authorize('update', $milestone->project);

        $project = $milestone->project;
        $milestone->delete();

        return redirect()->route('web.projects.show', $project)
            ->with('success', 'Milestone deleted.');
    }

    /**
     * Quick-complete a milestone (sets status + completed_date).
     */
    public function complete(Request $request, Milestone $milestone): RedirectResponse
    {
        $this->authorize('update', $milestone->project);

        $milestone->update([
            'status'         => 'completed',
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Milestone "' . $milestone->title . '" marked complete.');
    }
}