<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectIssue;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

/**
 * PMBOK §4.3.3 — Issue Log
 */
class ProjectIssueController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title'                   => ['required', 'string', 'max:255'],
            'description'             => ['nullable', 'string'],
            'category'                => ['required', Rule::in(['technical','schedule','cost','scope','resource','quality','stakeholder','external','other'])],
            'severity'                => ['required', Rule::in(ProjectIssue::SEVERITIES)],
            'priority'                => ['required', Rule::in(ProjectIssue::PRIORITIES)],
            'owner_id'                => ['nullable', 'exists:users,id'],
            'target_resolution_date'  => ['nullable', 'date'],
            'impact_description'      => ['nullable', 'string'],
            'notes'                   => ['nullable', 'string'],
        ]);

        $data['project_id'] = $project->id;
        $data['raised_by']  = Auth::id();
        $data['raised_date']= now();

        $project->issues()->create($data);

        return back()->with('success', 'Issue logged.');
    }

    public function update(Request $request, Project $project, ProjectIssue $issue)
    {
        $this->authorize('update', $project);
        abort_if($issue->project_id !== $project->id, 404);

        $data = $request->validate([
            'title'                   => ['required', 'string', 'max:255'],
            'description'             => ['nullable', 'string'],
            'category'                => ['required', Rule::in(['technical','schedule','cost','scope','resource','quality','stakeholder','external','other'])],
            'severity'                => ['required', Rule::in(ProjectIssue::SEVERITIES)],
            'priority'                => ['required', Rule::in(ProjectIssue::PRIORITIES)],
            'status'                  => ['required', Rule::in(ProjectIssue::STATUSES)],
            'owner_id'                => ['nullable', 'exists:users,id'],
            'target_resolution_date'  => ['nullable', 'date'],
            'resolution'              => ['nullable', 'string'],
            'impact_description'      => ['nullable', 'string'],
            'notes'                   => ['nullable', 'string'],
        ]);

        if ($data['status'] === 'resolved' && ! $issue->resolved_date) {
            $data['resolved_date'] = now();
        }

        $issue->update($data);

        return back()->with('success', 'Issue updated.');
    }

    public function destroy(Project $project, ProjectIssue $issue)
    {
        $this->authorize('update', $project);
        abort_if($issue->project_id !== $project->id, 404);

        $issue->delete();

        return back()->with('success', 'Issue removed.');
    }
}