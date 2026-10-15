<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectChange;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

/**
 * PMBOK §4.6 — Perform Integrated Change Control
 */
class ProjectChangeController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title'                 => ['required', 'string', 'max:255'],
            'description'           => ['required', 'string'],
            'change_type'           => ['required', Rule::in(ProjectChange::CHANGE_TYPES)],
            'justification'         => ['nullable', 'string'],
            'impacts_scope'         => ['boolean'],
            'impacts_schedule'      => ['boolean'],
            'impacts_cost'          => ['boolean'],
            'impacts_quality'       => ['boolean'],
            'schedule_impact_days'  => ['nullable', 'integer'],
            'cost_impact'           => ['nullable', 'numeric'],
            'risk_id'               => ['nullable', 'exists:project_risks,id'],
            'issue_id'              => ['nullable', 'exists:project_issues,id'],
        ]);

        $data['project_id']     = $project->id;
        $data['requested_by']   = Auth::id();
        $data['requested_date'] = now();
        $data['status']         = 'submitted';

        $project->changes()->create($data);

        return back()->with('success', 'Change request submitted.');
    }

    public function approve(Request $request, Project $project, ProjectChange $change)
    {
        $this->authorize('update', $project);
        abort_if($change->project_id !== $project->id, 404);

        $request->validate(['review_notes' => ['nullable', 'string']]);

        $change->update([
            'status'        => 'approved',
            'reviewed_by'   => Auth::id(),
            'review_notes'  => $request->review_notes,
            'decision_date' => now(),
        ]);

        return back()->with('success', 'Change request approved.');
    }

    public function reject(Request $request, Project $project, ProjectChange $change)
    {
        $this->authorize('update', $project);
        abort_if($change->project_id !== $project->id, 404);

        $request->validate(['review_notes' => ['required', 'string']]);

        $change->update([
            'status'        => 'rejected',
            'reviewed_by'   => Auth::id(),
            'review_notes'  => $request->review_notes,
            'decision_date' => now(),
        ]);

        return back()->with('success', 'Change request rejected.');
    }

    public function implement(Project $project, ProjectChange $change)
    {
        $this->authorize('update', $project);
        abort_if($change->project_id !== $project->id, 404);
        abort_if($change->status !== 'approved', 422, 'Only approved changes can be implemented.');

        $change->update([
            'status'               => 'implemented',
            'implementation_date'  => now(),
        ]);

        return back()->with('success', 'Change marked as implemented.');
    }

    public function destroy(Project $project, ProjectChange $change)
    {
        $this->authorize('update', $project);
        abort_if($change->project_id !== $project->id, 404);

        $change->delete();

        return back()->with('success', 'Change request removed.');
    }
}