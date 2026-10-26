<?php

namespace App\Http\Controllers\Web\Hiring;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobPosting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobApplicationController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', JobApplication::class);

        $applications = JobApplication::query()
            ->with('jobPosting:id,title,slug')
            ->when($request->query('job'), fn ($q, $id) => $q->where('job_posting_id', $id))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('search'), fn ($q, $term) => $q->where(
                fn ($w) => $w->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")
            ))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (JobApplication $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'email' => $a->email,
                'phone' => $a->phone,
                'linkedin_url' => $a->linkedin_url,
                'portfolio_url' => $a->portfolio_url,
                'cover_letter' => $a->cover_letter,
                'has_resume' => filled($a->resume_path),
                'status' => $a->status,
                'rating' => $a->rating,
                'notes' => $a->notes,
                'source' => $a->source,
                'job' => $a->jobPosting ? ['id' => $a->jobPosting->id, 'title' => $a->jobPosting->title] : null,
                'applied_at' => $a->created_at->toDateTimeString(),
            ]);

        return Inertia::render('hr/jobs/applications', [
            'applications' => $applications,
            'jobs' => JobPosting::query()->orderBy('title')->get(['id', 'title']),
            'statuses' => JobApplication::STATUSES,
            'filters' => $request->only(['job', 'status', 'search']),
            'counts' => JobApplication::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function update(Request $request, JobApplication $application): RedirectResponse
    {
        $this->authorize('update', $application);

        $data = $request->validate([
            'status' => ['required', Rule::in(JobApplication::STATUSES)],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $application->update([
            ...$data,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Application updated.');
    }

    public function resume(JobApplication $application): StreamedResponse
    {
        $this->authorize('view', $application);

        abort_unless($application->resume_path && Storage::exists($application->resume_path), 404);

        return Storage::download($application->resume_path, $application->resume_original_name ?: 'cv');
    }

    public function destroy(JobApplication $application): RedirectResponse
    {
        $this->authorize('delete', $application);

        if ($application->resume_path) {
            Storage::delete($application->resume_path);
        }

        $application->delete();

        return back()->with('success', 'Application deleted.');
    }
}
