<?php

namespace App\Http\Controllers\Web\Hiring;

use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use App\Services\LinkedIn\LinkedInService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * LinkedIn posting page for a job: a ready-made post, a share link, and
 * (when API credentials are configured) one-click publishing.
 */
class LinkedInController extends Controller
{
    public function show(LinkedInService $linkedin, JobPosting $job): Response
    {
        $this->authorize('publish', $job);

        return Inertia::render('hr/jobs/linkedin', [
            'job' => [
                'id' => $job->id,
                'title' => $job->title,
                'status' => $job->status,
                'is_open' => $job->isOpen(),
                'linkedin_posted_at' => $job->linkedin_posted_at?->toDateTimeString(),
                'linkedin_post_urn' => $job->linkedin_post_urn,
            ],
            'text' => $linkedin->compose($job),
            'jobUrl' => $linkedin->jobUrl($job),
            'shareUrl' => $linkedin->shareUrl($job),
            'apiConfigured' => $linkedin->isConfigured(),
            'companyUrl' => config('site.linkedin_company_url'),
        ]);
    }

    public function post(Request $request, LinkedInService $linkedin, JobPosting $job): RedirectResponse
    {
        $this->authorize('publish', $job);

        $data = $request->validate(['text' => ['required', 'string', 'max:3000']]);

        if (! $job->isOpen()) {
            return back()->with('error', 'Publish the job on the careers page before announcing it on LinkedIn.');
        }

        $result = $linkedin->publish($job, $data['text']);

        if (! $result['success']) {
            return back()->with('error', $result['error']);
        }

        $job->update(['linkedin_post_urn' => $result['urn'], 'linkedin_posted_at' => now()]);

        return back()->with('success', 'Posted to LinkedIn.');
    }

    /**
     * HR shared the post by hand using the share link; record that it happened.
     */
    public function markShared(JobPosting $job): RedirectResponse
    {
        $this->authorize('publish', $job);

        $job->update(['linkedin_posted_at' => now()]);

        return back()->with('success', 'Marked as shared on LinkedIn.');
    }
}
