<?php

namespace App\Http\Controllers\Web\Hiring;

use App\Http\Controllers\Controller;
use App\Http\Requests\Careers\SaveJobPostingRequest;
use App\Models\JobPosting;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * HR screens for managing job postings that appear on the public careers site.
 */
class JobPostingController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', JobPosting::class);

        $jobs = JobPosting::query()
            ->withCount([
                'applications',
                'applications as new_applications_count' => fn ($q) => $q->where('status', 'new'),
            ])
            ->latest()
            ->get()
            ->map(fn (JobPosting $job) => [
                'id' => $job->id,
                'title' => $job->title,
                'slug' => $job->slug,
                'department' => $job->department,
                'location' => $job->is_remote ? 'Remote' : $job->location,
                'status' => $job->status,
                'is_open' => $job->isOpen(),
                'published_at' => $job->published_at?->toDateString(),
                'closes_at' => $job->closes_at?->toDateString(),
                'applications_count' => $job->applications_count,
                'new_applications_count' => $job->new_applications_count,
                'linkedin_posted_at' => $job->linkedin_posted_at?->toDateString(),
            ]);

        return Inertia::render('hr/jobs/index', ['jobs' => $jobs]);
    }

    public function create(): Response
    {
        $this->authorize('create', JobPosting::class);

        return Inertia::render('hr/jobs/create', $this->formOptions());
    }

    public function store(SaveJobPostingRequest $request): RedirectResponse
    {
        $this->authorize('create', JobPosting::class);

        $job = JobPosting::create([
            ...$request->validated(),
            'status' => JobPosting::STATUS_DRAFT,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('web.hr.jobs.edit', $job)->with('success', 'Job saved as a draft. Publish it when you are ready.');
    }

    public function edit(JobPosting $job): Response
    {
        $this->authorize('update', $job);

        return Inertia::render('hr/jobs/edit', [
            ...$this->formOptions(),
            'job' => $job->only([
                'id', 'title', 'slug', 'department', 'location', 'is_remote', 'employment_type', 'experience_level',
                'summary', 'description', 'responsibilities', 'requirements', 'benefits',
                'salary_min', 'salary_max', 'salary_currency', 'status',
            ]) + ['closes_at' => $job->closes_at?->toDateString(), 'is_open' => $job->isOpen()],
        ]);
    }

    public function update(SaveJobPostingRequest $request, JobPosting $job): RedirectResponse
    {
        $this->authorize('update', $job);

        // The slug is kept on purpose so links already shared on LinkedIn keep working.
        $job->update($request->validated());

        return back()->with('success', 'Job updated.');
    }

    public function publish(JobPosting $job): RedirectResponse
    {
        $this->authorize('publish', $job);

        $job->update([
            'status' => JobPosting::STATUS_PUBLISHED,
            'published_at' => $job->published_at ?? now(),
        ]);

        return back()->with('success', 'Job published on the careers page.');
    }

    public function close(JobPosting $job): RedirectResponse
    {
        $this->authorize('publish', $job);

        $job->update(['status' => JobPosting::STATUS_CLOSED]);

        return back()->with('success', 'Job closed. It is no longer visible on the careers page.');
    }

    public function destroy(JobPosting $job): RedirectResponse
    {
        $this->authorize('delete', $job);

        $job->delete();

        return redirect()->route('web.hr.jobs.index')->with('success', 'Job deleted.');
    }

    /** @return array<string, mixed> */
    private function formOptions(): array
    {
        return [
            'employmentTypes' => JobPosting::EMPLOYMENT_TYPES,
            'experienceLevels' => JobPosting::EXPERIENCE_LEVELS,
        ];
    }
}
