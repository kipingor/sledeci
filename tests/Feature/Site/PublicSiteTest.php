<?php

namespace Tests\Feature\Site;

use App\Models\ContactMessage;
use App\Models\JobApplication;
use App\Models\JobPosting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicSiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_public_page_loads_for_guests(): void
    {
        foreach (['/', '/about', '/solutions', '/terms', '/contact', '/careers'] as $path) {
            $this->get($path)->assertOk();
        }
    }

    public function test_home_redirects_signed_in_users_to_the_dashboard(): void
    {
        $this->actingAs(\App\Models\User::factory()->create())
            ->get('/')
            ->assertRedirect(route('web.dashboard'));
    }

    public function test_contact_form_saves_the_message(): void
    {
        $this->post('/contact', [
            'name' => 'Amina',
            'email' => 'amina@example.com',
            'message' => 'We would like a demo of the accounting module.',
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('contact_messages', ['email' => 'amina@example.com', 'status' => 'new']);
    }

    public function test_contact_form_rejects_bots_that_fill_the_honeypot(): void
    {
        $this->post('/contact', [
            'name' => 'Bot',
            'email' => 'bot@example.com',
            'message' => 'Buy cheap pills now please thanks',
            'website' => 'http://spam.example',
        ])->assertSessionHasErrors('website');

        $this->assertSame(0, ContactMessage::count());
    }

    public function test_only_open_roles_are_listed_and_viewable(): void
    {
        $open = JobPosting::factory()->create(['title' => 'Open Accountant']);
        $draft = JobPosting::factory()->draft()->create(['title' => 'Draft Role']);
        $closed = JobPosting::factory()->closed()->create(['title' => 'Closed Role']);
        $expired = JobPosting::factory()->expired()->create(['title' => 'Expired Role']);

        $this->get('/careers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('careers/index')
                ->has('jobs', 1)
                ->where('jobs.0.title', 'Open Accountant'));

        $this->get("/careers/{$open->slug}")->assertOk()->assertInertia(fn ($p) => $p->component('careers/show')->has('jsonLd'));

        foreach ([$draft, $closed, $expired] as $job) {
            $this->get("/careers/{$job->slug}")->assertNotFound();
        }
    }

    public function test_a_candidate_can_apply_with_a_cv(): void
    {
        Storage::fake('local');
        $job = JobPosting::factory()->create();

        $this->post("/careers/{$job->slug}/apply?src=linkedin", [
            'name' => 'Brian Otieno',
            'email' => 'Brian@Example.com',
            'cover_letter' => 'I would love to join.',
            'consent' => '1',
            'resume' => UploadedFile::fake()->create('cv.pdf', 200, 'application/pdf'),
        ])->assertRedirect()->assertSessionHas('success');

        $application = JobApplication::firstOrFail();
        $this->assertSame('brian@example.com', $application->email);
        $this->assertSame('linkedin', $application->source);
        $this->assertSame('cv.pdf', $application->resume_original_name);
        Storage::disk('local')->assertExists($application->resume_path);
    }

    public function test_applications_require_a_cv_consent_and_an_open_role(): void
    {
        Storage::fake('local');
        $job = JobPosting::factory()->create();

        $this->post("/careers/{$job->slug}/apply", ['name' => 'X', 'email' => 'x@example.com'])
            ->assertSessionHasErrors(['resume', 'consent']);

        $this->post("/careers/{$job->slug}/apply", [
            'name' => 'X', 'email' => 'x@example.com', 'consent' => '1',
            'resume' => UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream'),
        ])->assertSessionHasErrors('resume');

        $closed = JobPosting::factory()->closed()->create();
        $this->post("/careers/{$closed->slug}/apply", [
            'name' => 'X', 'email' => 'x@example.com', 'consent' => '1',
            'resume' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'),
        ])->assertNotFound();

        $this->assertSame(0, JobApplication::count());
    }

    public function test_the_same_email_cannot_apply_twice_for_one_role(): void
    {
        Storage::fake('local');
        $job = JobPosting::factory()->create();
        JobApplication::factory()->create(['job_posting_id' => $job->id, 'email' => 'dup@example.com']);

        $this->post("/careers/{$job->slug}/apply", [
            'name' => 'Dup', 'email' => 'DUP@example.com', 'consent' => '1',
            'resume' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'),
        ])->assertSessionHasErrors('email');

        $this->assertSame(1, JobApplication::count());
    }
}
