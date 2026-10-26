<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

/**
 * PMBOK §11 — Project Risk Management
 * Handles the Risk Register: Identify, Analyse, Plan Responses, Monitor.
 */
class ProjectRiskController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title'                => ['required', 'string', 'max:255'],
            'description'          => ['nullable', 'string'],
            'category'             => ['required', Rule::in(ProjectRisk::CATEGORIES)],
            'probability'          => ['required', 'integer', 'min:1', 'max:5'],
            'impact'               => ['required', 'integer', 'min:1', 'max:5'],
            'response_type'        => ['nullable', Rule::in(ProjectRisk::RESPONSE_TYPES)],
            'response_plan'        => ['nullable', 'string'],
            'contingency_plan'     => ['nullable', 'string'],
            'trigger'              => ['nullable', 'string'],
            'residual_probability' => ['nullable', 'integer', 'min:1', 'max:5'],
            'residual_impact'      => ['nullable', 'integer', 'min:1', 'max:5'],
            'owner_id'             => ['nullable', 'exists:users,id'],
            'status'               => ['required', Rule::in(ProjectRisk::STATUSES)],
            'identified_date'      => ['nullable', 'date'],
            'review_date'          => ['nullable', 'date'],
            'notes'                => ['nullable', 'string'],
        ]);

        $data['project_id'] = $project->id;
        $data['created_by'] = Auth::id();

        $project->risks()->create($data);

        return back()->with('success', 'Risk added to the register.');
    }

    public function update(Request $request, Project $project, ProjectRisk $risk)
    {
        $this->authorize('update', $project);
        abort_if($risk->project_id !== $project->id, 404);

        $data = $request->validate([
            'title'                => ['required', 'string', 'max:255'],
            'description'          => ['nullable', 'string'],
            'category'             => ['required', Rule::in(ProjectRisk::CATEGORIES)],
            'probability'          => ['required', 'integer', 'min:1', 'max:5'],
            'impact'               => ['required', 'integer', 'min:1', 'max:5'],
            'response_type'        => ['nullable', Rule::in(ProjectRisk::RESPONSE_TYPES)],
            'response_plan'        => ['nullable', 'string'],
            'contingency_plan'     => ['nullable', 'string'],
            'trigger'              => ['nullable', 'string'],
            'residual_probability' => ['nullable', 'integer', 'min:1', 'max:5'],
            'residual_impact'      => ['nullable', 'integer', 'min:1', 'max:5'],
            'owner_id'             => ['nullable', 'exists:users,id'],
            'status'               => ['required', Rule::in(ProjectRisk::STATUSES)],
            'identified_date'      => ['nullable', 'date'],
            'review_date'          => ['nullable', 'date'],
            'notes'                => ['nullable', 'string'],
        ]);

        $risk->update($data);

        return back()->with('success', 'Risk updated.');
    }

    public function destroy(Project $project, ProjectRisk $risk)
    {
        $this->authorize('update', $project);
        abort_if($risk->project_id !== $project->id, 404);

        $risk->delete();

        return back()->with('success', 'Risk removed from register.');
    }

    /**
     * Mark a risk as realised — it becomes an Issue.
     * PMBOK §11.7: realised risks are handled via the Issue Log.
     */
    public function realize(Request $request, Project $project, ProjectRisk $risk)
    {
        $this->authorize('update', $project);
        abort_if($risk->project_id !== $project->id, 404);

        $request->validate([
            'issue_title'       => ['required', 'string', 'max:255'],
            'issue_description' => ['nullable', 'string'],
        ]);

        // Create the corresponding issue
        $issue = $project->issues()->create([
            'risk_id'     => $risk->id,
            'raised_by'   => Auth::id(),
            'owner_id'    => $risk->owner_id,
            'title'       => $request->issue_title,
            'description' => $request->issue_description ?? $risk->description,
            'category'    => $risk->category,
            'severity'    => match (true) {
                $risk->impact >= 4 => 'high',
                $risk->impact >= 3 => 'medium',
                default            => 'low',
            },
            'raised_date' => now(),
        ]);

        // Close the risk
        $risk->update(['status' => 'realized']);

        return back()->with('success', 'Risk marked as realised and added to the Issue Log.');
    }
}