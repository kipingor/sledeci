<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectLesson;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

/**
 * PMBOK §4.4 / §4.7 — Lessons Learned Register
 */
class ProjectLessonController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'situation'      => ['required', 'string'],
            'impact'         => ['required', 'string'],
            'recommendation' => ['required', 'string'],
            'category'       => ['required', Rule::in(ProjectLesson::CATEGORIES)],
            'type'           => ['required', Rule::in(ProjectLesson::TYPES)],
            'phase_captured' => ['nullable', Rule::in(ProjectLesson::PHASES)],
            'tags'           => ['nullable', 'array'],
            'tags.*'         => ['string', 'max:50'],
        ]);

        $data['project_id'] = $project->id;
        $data['created_by'] = Auth::id();

        $project->lessons()->create($data);

        return back()->with('success', 'Lesson learned recorded.');
    }

    public function update(Request $request, Project $project, ProjectLesson $lesson)
    {
        $this->authorize('update', $project);
        abort_if($lesson->project_id !== $project->id, 404);

        $data = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'situation'      => ['required', 'string'],
            'impact'         => ['required', 'string'],
            'recommendation' => ['required', 'string'],
            'category'       => ['required', Rule::in(ProjectLesson::CATEGORIES)],
            'type'           => ['required', Rule::in(ProjectLesson::TYPES)],
            'phase_captured' => ['nullable', Rule::in(ProjectLesson::PHASES)],
            'tags'           => ['nullable', 'array'],
            'tags.*'         => ['string', 'max:50'],
        ]);

        $lesson->update($data);

        return back()->with('success', 'Lesson updated.');
    }

    public function destroy(Project $project, ProjectLesson $lesson)
    {
        $this->authorize('update', $project);
        abort_if($lesson->project_id !== $project->id, 404);

        $lesson->delete();

        return back()->with('success', 'Lesson removed.');
    }
}