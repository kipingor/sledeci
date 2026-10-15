<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectStakeholder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

/**
 * PMBOK §13 — Project Stakeholder Management
 */
class ProjectStakeholderController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'name'                    => ['required', 'string', 'max:255'],
            'email'                   => ['nullable', 'email'],
            'organization'            => ['nullable', 'string', 'max:255'],
            'role'                    => ['nullable', 'string', 'max:255'],
            'user_id'                 => ['nullable', 'exists:users,id'],
            'influence'               => ['required', Rule::in(ProjectStakeholder::INFLUENCE_LEVELS)],
            'interest'                => ['required', Rule::in(ProjectStakeholder::INTEREST_LEVELS)],
            'current_engagement'      => ['required', Rule::in(ProjectStakeholder::ENGAGEMENT_LEVELS)],
            'desired_engagement'      => ['required', Rule::in(ProjectStakeholder::ENGAGEMENT_LEVELS)],
            'preferred_communication' => ['nullable', 'string', 'max:255'],
            'communication_frequency' => ['nullable', 'string', 'max:255'],
            'expectations'            => ['nullable', 'string'],
            'concerns'                => ['nullable', 'string'],
            'engagement_strategy'     => ['nullable', 'string'],
            'notes'                   => ['nullable', 'string'],
        ]);

        $data['project_id'] = $project->id;

        $project->stakeholders()->create($data);

        return back()->with('success', 'Stakeholder added to register.');
    }

    public function update(Request $request, Project $project, ProjectStakeholder $stakeholder)
    {
        $this->authorize('update', $project);
        abort_if($stakeholder->project_id !== $project->id, 404);

        $data = $request->validate([
            'name'                    => ['required', 'string', 'max:255'],
            'email'                   => ['nullable', 'email'],
            'organization'            => ['nullable', 'string', 'max:255'],
            'role'                    => ['nullable', 'string', 'max:255'],
            'influence'               => ['required', Rule::in(ProjectStakeholder::INFLUENCE_LEVELS)],
            'interest'                => ['required', Rule::in(ProjectStakeholder::INTEREST_LEVELS)],
            'current_engagement'      => ['required', Rule::in(ProjectStakeholder::ENGAGEMENT_LEVELS)],
            'desired_engagement'      => ['required', Rule::in(ProjectStakeholder::ENGAGEMENT_LEVELS)],
            'preferred_communication' => ['nullable', 'string', 'max:255'],
            'communication_frequency' => ['nullable', 'string', 'max:255'],
            'expectations'            => ['nullable', 'string'],
            'concerns'                => ['nullable', 'string'],
            'engagement_strategy'     => ['nullable', 'string'],
            'notes'                   => ['nullable', 'string'],
            'is_active'               => ['boolean'],
        ]);

        $stakeholder->update($data);

        return back()->with('success', 'Stakeholder updated.');
    }

    public function destroy(Project $project, ProjectStakeholder $stakeholder)
    {
        $this->authorize('update', $project);
        abort_if($stakeholder->project_id !== $project->id, 404);

        $stakeholder->delete();

        return back()->with('success', 'Stakeholder removed from register.');
    }
}