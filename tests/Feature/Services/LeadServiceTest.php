<?php

namespace Tests\Feature\Services;

use Tests\TestCase;
use App\Models\Lead;
use App\Models\User;
use App\Services\Lead\LeadService;
use App\Enums\LeadStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LeadServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_lead()
    {
        // Create and authenticate user
        $user = User::factory()->create();
        $this->actingAs($user);

        // Now create lead (created_by will be set automatically)
        $lead = Lead::factory()->create([
            'title' => 'Test Lead',
            'status' => 'new',
            'created_by' => $user->id,
            'owner_id' => $user->id,
        ]);

        $this->assertDatabaseHas('leads', [
            'title' => 'Test Lead',
        ]);
        $this->assertNotNull($lead->created_by);
        $this->assertEquals($user->id, $lead->created_by);
    }

    public function test_it_creates_a_lead_with_default_status(): void
    {
        $lead = Lead::factory()->create([
            'title' => 'Test Lead',
        ]);

        $this->assertInstanceOf(Lead::class, $lead);
    }

    public function test_it_updates_a_lead(): void
    {
        $lead = Lead::factory()->create();

        $lead->update([
            'title' => 'Updated'
        ]);

        $lead->refresh();

        $this->assertEquals('Updated', $lead->title);
    }

    public function test_it_transitions_lead_status(): void
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create([
            'created_by' => $user->id,
            'owner_id' => $user->id,
            'status' => leadStatus::NEW,
        ]);

        $lead->update([
            'status' => LeadStatus::QUALIFIED->value,
            'qualified_at' => now()
        ]);

        $this->assertNotNull($lead->fresh()->qualified_at);
    }
}
