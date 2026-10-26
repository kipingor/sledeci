<?php

namespace Tests\Feature\Hiring;

use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HiringTest extends TestCase
{
    use RefreshDatabase;

    private function as(string $role): static
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $this->actingAs($user);
    }

    private function jobPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Payroll Officer',
            'employment_type' => 'full_time',
            'description' => 'Run monthly payroll.',
            'is_remote' => false,
            'salary_currency' => 'KES',
        ], $overrides);
    }

    public function test_only_hr_roles_can_open_the_hiring_screens(): void
    {
        $this->as('human resource')->get('/hr/jobs')->assertOk();
        $this->as('manager')->get('/hr/jobs')->assertOk();
        $this->as('sales')->get('/hr/jobs')->assertForbidden();
        $this->as('sales')->get('/hr/applications')->assertForbidden();
    }

    public function test_guests_are_sent_to_login(): void
    {
        $this->get('/hr/jobs')->assertRedirect('/login');
    }

    public function test_hr_can_create_publish_and_close_a_job(): void
    {
        $this->as('human resource');

        $this->post('/hr/jobs', $this->jobPayload())->assertRedirect();
        $job = JobPosting::firstOrFail();
        $this->assertSame('draft', $job->status);
        $this->assertSame('payroll-officer', $job->slug);

        $this->get("/careers/{$job->slug}")->assertNotFound();

        $this->post("/hr/jobs/{$job->slug}/publish")->assertRedirect();
        $this->assertSame('published', $job->fresh()->status);
        $this->get("/careers/{$job->slug}")->assertOk();

        $this->post("/hr/jobs/{$job->slug}/close")->assertRedirect();
        $this->get("/careers/{$job->slug}")->assertNotFound();
    }

    public function test_editing_a_job_keeps_its_public_url(): void
    {
        $job = JobPosting::factory()->create(['title' => 'Old Title']);

        $this->as('human resource')
            ->put("/hr/jobs/{$job->slug}", $this->jobPayload(['title' => 'New Title']))
            ->assertRedirect();

        $this->assertSame('New Title', $job->fresh()->title);
        $this->assertSame($job->slug, $job->fresh()->slug);
    }

    public function test_salary_range_must_be_ordered(): void
    {
        $this->as('human resource')
            ->post('/hr/jobs', $this->jobPayload(['salary_min' => 200000, 'salary_max' => 100000]))
            ->assertSessionHasErrors('salary_max');
    }

    public function test_read_only_roles_can_view_but_not_change_jobs(): void
    {
        $job = JobPosting::factory()->create();

        $this->as('auditor')->get('/hr/jobs')->assertOk();
        $this->as('auditor')->post('/hr/jobs', $this->jobPayload())->assertForbidden();
        $this->as('auditor')->post("/hr/jobs/{$job->slug}/close")->assertForbidden();
    }

    public function test_a_job_with_applications_cannot_be_deleted(): void
    {
        $job = JobPosting::factory()->create();
        JobApplication::factory()->create(['job_posting_id' => $job->id]);

        $this->as('human resource')->delete("/hr/jobs/{$job->slug}")->assertForbidden();
        $this->assertNotSoftDeleted($job);
    }

    public function test_hr_can_review_an_application_and_download_the_cv(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('careers/resumes/cv.pdf', 'pdf-bytes');
        $application = JobApplication::factory()->create(['resume_path' => 'careers/resumes/cv.pdf', 'resume_original_name' => 'cv.pdf']);

        $this->as('human resource');

        $this->get('/hr/applications')->assertOk()->assertInertia(fn ($p) => $p->has('applications.data', 1));

        $this->patch("/hr/applications/{$application->id}", ['status' => 'interview', 'rating' => 4, 'notes' => 'Strong.'])->assertRedirect();
        $this->assertSame('interview', $application->fresh()->status);
        $this->assertNotNull($application->fresh()->reviewed_by);

        $this->patch("/hr/applications/{$application->id}", ['status' => 'banana'])->assertSessionHasErrors('status');

        $this->get("/hr/applications/{$application->id}/resume")->assertOk()->assertDownload('cv.pdf');
    }

    public function test_applications_are_private_to_hr(): void
    {
        $application = JobApplication::factory()->create(['resume_path' => 'careers/resumes/x.pdf']);

        $this->as('sales')->get("/hr/applications/{$application->id}/resume")->assertForbidden();
        $this->as('auditor')->patch("/hr/applications/{$application->id}", ['status' => 'hired'])->assertForbidden();
    }

    public function test_linkedin_page_offers_a_share_link_and_post_text(): void
    {
        $job = JobPosting::factory()->create(['title' => 'Senior Accountant', 'summary' => 'Lead our finance team.']);

        $this->as('human resource')
            ->get("/hr/jobs/{$job->slug}/linkedin")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('hr/jobs/linkedin')
                ->where('apiConfigured', false)
                ->where('shareUrl', fn ($url) => str_starts_with($url, 'https://www.linkedin.com/sharing/share-offsite/?url='))
                ->where('text', fn ($t) => str_contains($t, "We're hiring: Senior Accountant") && str_contains($t, 'src=linkedin')));
    }

    public function test_posting_to_linkedin_needs_credentials_and_an_open_role(): void
    {
        $job = JobPosting::factory()->create();

        $this->as('human resource')
            ->post("/hr/jobs/{$job->slug}/linkedin", ['text' => 'Hello'])
            ->assertSessionHas('error');

        $this->assertNull($job->fresh()->linkedin_posted_at);
    }

    public function test_posting_to_linkedin_records_the_post_when_configured(): void
    {
        config(['services.linkedin.access_token' => 'token', 'services.linkedin.author_urn' => 'urn:li:organization:1']);
        Http::fake(['api.linkedin.com/*' => Http::response([], 201, ['x-restli-id' => 'urn:li:share:123'])]);
        $job = JobPosting::factory()->create();

        $this->as('human resource')
            ->post("/hr/jobs/{$job->slug}/linkedin", ['text' => 'We are hiring'])
            ->assertSessionHas('success');

        $this->assertSame('urn:li:share:123', $job->fresh()->linkedin_post_urn);
        $this->assertNotNull($job->fresh()->linkedin_posted_at);

        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer token')
            && $request['author'] === 'urn:li:organization:1');
    }

    public function test_a_linkedin_api_error_is_reported_not_thrown(): void
    {
        config(['services.linkedin.access_token' => 'token', 'services.linkedin.author_urn' => 'urn:li:organization:1']);
        Http::fake(['api.linkedin.com/*' => Http::response(['message' => 'Token expired'], 401)]);
        $job = JobPosting::factory()->create();

        $this->as('human resource')
            ->post("/hr/jobs/{$job->slug}/linkedin", ['text' => 'We are hiring'])
            ->assertSessionHas('error', 'Token expired');

        $this->assertNull($job->fresh()->linkedin_posted_at);
    }

    public function test_hr_can_mark_a_job_as_shared_manually(): void
    {
        $job = JobPosting::factory()->create();

        $this->as('human resource')->post("/hr/jobs/{$job->slug}/linkedin/shared")->assertRedirect();

        $this->assertNotNull($job->fresh()->linkedin_posted_at);
    }
}
