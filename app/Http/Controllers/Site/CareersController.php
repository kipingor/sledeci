<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Http\Requests\Careers\StoreJobApplicationRequest;
use App\Models\JobPosting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Public careers site: open roles, role detail and the application form.
 */
class CareersController extends Controller
{
    public function index(Request $request): Response
    {
        $jobs = JobPosting::open()
            ->when($request->query('department'), fn ($q, $d) => $q->where('department', $d))
            ->orderByDesc('published_at')
            ->get()
            ->map(fn (JobPosting $job) => $this->card($job))
            ->values();

        return Inertia::render('careers/index', [
            'jobs' => $jobs,
            'departments' => JobPosting::open()->whereNotNull('department')->distinct()->orderBy('department')->pluck('department'),
            'filters' => ['department' => $request->query('department')],
            'linkedin' => config('site.linkedin_company_url'),
        ]);
    }

    public function show(Request $request, JobPosting $jobPosting): Response
    {
        abort_unless($jobPosting->isOpen(), 404);

        return Inertia::render('careers/show', [
            'job' => $this->detail($jobPosting),
            'source' => $request->query('src') === 'linkedin' ? 'linkedin' : null,
            'jsonLd' => $this->jsonLd($jobPosting),
        ]);
    }

    public function apply(StoreJobApplicationRequest $request, JobPosting $jobPosting): RedirectResponse
    {
        abort_unless($jobPosting->isOpen(), 404);

        if ($jobPosting->applications()->where('email', $request->string('email')->lower()->toString())->exists()) {
            return back()->withErrors(['email' => 'You have already applied for this role with this email address.']);
        }

        $resume = $request->file('resume');

        $application = $jobPosting->applications()->create([
            ...$request->safe()->only(['name', 'phone', 'linkedin_url', 'portfolio_url', 'cover_letter']),
            'email' => $request->string('email')->lower()->toString(),
            'resume_path' => $resume->store('careers/resumes'), // private disk, served only to HR
            'resume_original_name' => $resume->getClientOriginalName(),
            'source' => $request->query('src') === 'linkedin' ? 'linkedin' : 'careers_page',
            'ip_address' => $request->ip(),
        ]);

        try {
            Mail::raw(
                "New application for {$jobPosting->title} (#{$application->id})\n\n"
                ."Name: {$application->name}\nEmail: {$application->email}\n"
                .'Phone: '.($application->phone ?: '-')."\nLinkedIn: ".($application->linkedin_url ?: '-')."\n"
                .'Source: '.$application->source."\n\nReview it in HR > Applications.\n",
                fn ($mail) => $mail
                    ->to(config('site.hr_email'))
                    ->replyTo($application->email, $application->name)
                    ->subject("Application: {$jobPosting->title} - {$application->name}")
            );
        } catch (Throwable $e) {
            report($e); // the application is saved; do not fail the candidate
        }

        return back()->with('success', 'Thank you for applying. We have received your application and will be in touch if your profile matches.');
    }

    /** @return array<string, mixed> */
    private function card(JobPosting $job): array
    {
        return [
            'id' => $job->id,
            'title' => $job->title,
            'slug' => $job->slug,
            'department' => $job->department,
            'location' => $job->location,
            'is_remote' => $job->is_remote,
            'employment_type' => $job->employmentTypeLabel(),
            'summary' => $job->summary,
            'published_at' => $job->published_at?->toDateString(),
            'closes_at' => $job->closes_at?->toDateString(),
        ];
    }

    /** @return array<string, mixed> */
    private function detail(JobPosting $job): array
    {
        return [
            ...$this->card($job),
            'experience_level' => $job->experience_level ? (JobPosting::EXPERIENCE_LEVELS[$job->experience_level] ?? null) : null,
            'description' => $job->description,
            'responsibilities' => $job->responsibilities,
            'requirements' => $job->requirements,
            'benefits' => $job->benefits,
            'salary' => $this->salaryText($job),
        ];
    }

    private function salaryText(JobPosting $job): ?string
    {
        if ($job->salary_min === null && $job->salary_max === null) {
            return null;
        }

        $fmt = fn ($v) => number_format((float) $v);

        return match (true) {
            $job->salary_min !== null && $job->salary_max !== null => "{$job->salary_currency} {$fmt($job->salary_min)} - {$fmt($job->salary_max)} per month",
            $job->salary_min !== null => "From {$job->salary_currency} {$fmt($job->salary_min)} per month",
            default => "Up to {$job->salary_currency} {$fmt($job->salary_max)} per month",
        };
    }

    /**
     * schema.org JobPosting markup so Google for Jobs and LinkedIn can index the role.
     *
     * @return array<string, mixed>
     */
    private function jsonLd(JobPosting $job): array
    {
        $types = ['full_time' => 'FULL_TIME', 'part_time' => 'PART_TIME', 'contract' => 'CONTRACTOR', 'internship' => 'INTERN'];

        $data = [
            '@context' => 'https://schema.org',
            '@type' => 'JobPosting',
            'title' => $job->title,
            'description' => nl2br(e($job->description)),
            'datePosted' => $job->published_at?->toDateString(),
            'validThrough' => $job->closes_at?->endOfDay()->toIso8601String(),
            'employmentType' => $types[$job->employment_type] ?? 'OTHER',
            'hiringOrganization' => ['@type' => 'Organization', 'name' => config('site.name'), 'sameAs' => url('/')],
            'directApply' => true,
        ];

        if ($job->is_remote) {
            $data['jobLocationType'] = 'TELECOMMUTE';
            $data['applicantLocationRequirements'] = ['@type' => 'Country', 'name' => config('site.country')];
        } else {
            $data['jobLocation'] = [
                '@type' => 'Place',
                'address' => ['@type' => 'PostalAddress', 'addressLocality' => $job->location ?: config('site.country'), 'addressCountry' => config('site.country')],
            ];
        }

        if ($job->salary_min !== null || $job->salary_max !== null) {
            $data['baseSalary'] = [
                '@type' => 'MonetaryAmount',
                'currency' => $job->salary_currency,
                'value' => array_filter([
                    '@type' => 'QuantitativeValue',
                    'minValue' => $job->salary_min !== null ? (float) $job->salary_min : null,
                    'maxValue' => $job->salary_max !== null ? (float) $job->salary_max : null,
                    'unitText' => 'MONTH',
                ], fn ($v) => $v !== null),
            ];
        }

        return array_filter($data, fn ($v) => $v !== null);
    }
}
