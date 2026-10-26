<?php

namespace Tests\Feature\Api\V1;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
use App\Services\Lead\LeadStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadStatusTransitionTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected PipelineStage $stage;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->user->assignRole('sales'); // role-less users are denied by module access control
        $this->stage = PipelineStage::factory()->create(['key' => 'new']);
    }

    /**
     * Test valid status transition from NEW to CONTACTED
     */
    public function test_can_transition_from_new_to_contacted(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::CONTACTED->value,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Lead status updated to Contacted',
            ]);

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'status' => LeadStatus::CONTACTED->value,
        ]);

        // Check that timestamp was set
        $lead->refresh();
        $this->assertNotNull($lead->contacted_at);
    }

    /**
     * Test invalid status transition from NEW to WON (should fail)
     */
    public function test_cannot_transition_from_new_to_won(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::WON->value,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'The given data was invalid.',
            ])
            ->assertJsonStructure([
                'errors' => ['status'],
                'details' => [
                    'current_status',
                    'allowed_transitions',
                ],
            ]);

        // Verify status didn't change
        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'status' => LeadStatus::NEW->value,
        ]);
    }

    /**
     * Test marking lead as lost requires reason
     */
    public function test_marking_as_lost_requires_reason(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEGOTIATION,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::LOST->value,
                // No reason provided
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    /**
     * Test marking lead as lost with reason succeeds
     */
    public function test_can_mark_as_lost_with_reason(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEGOTIATION,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        $reason = 'Customer chose competitor';

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::LOST->value,
                'reason' => $reason,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $lead->refresh();
        $this->assertEquals(LeadStatus::LOST, $lead->status);
        $this->assertNotNull($lead->lost_at);
        $this->assertNotNull($lead->metadata['lost_reason']);
        $this->assertEquals($reason, $lead->metadata['lost_reason']);
    }

    /**
     * Test complete pipeline flow
     */
    public function test_complete_pipeline_flow(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        // NEW -> CONTACTED
        $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::CONTACTED->value,
            ])
            ->assertStatus(200);

        // CONTACTED -> QUALIFIED
        $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::QUALIFIED->value,
            ])
            ->assertStatus(200);

        // QUALIFIED -> PROPOSAL_SENT
        $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::PROPOSAL_SENT->value,
            ])
            ->assertStatus(200);

        // PROPOSAL_SENT -> NEGOTIATION
        $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::NEGOTIATION->value,
            ])
            ->assertStatus(200);

        // NEGOTIATION -> WON
        $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::WON->value,
            ])
            ->assertStatus(200);

        $lead->refresh();
        $this->assertEquals(LeadStatus::WON, $lead->status);
        $this->assertNotNull($lead->contacted_at);
        $this->assertNotNull($lead->qualified_at);
        $this->assertNotNull($lead->proposal_sent_at);
        $this->assertNotNull($lead->negotiation_started_at);
        $this->assertNotNull($lead->won_at);
    }

    /**
     * Test cannot transition from terminal status (WON) except to ARCHIVED
     */
    public function test_cannot_transition_from_won_except_to_archived(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::WON,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        // Try to go back to NEGOTIATION (should fail)
        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::NEGOTIATION->value,
            ]);

        $response->assertStatus(422);

        // But can archive (should succeed)
        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::ARCHIVED->value,
            ]);

        $response->assertStatus(200);
    }

    /**
     * Test get available transitions endpoint
     */
    public function test_can_get_available_transitions(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::QUALIFIED,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/v1/leads/{$lead->id}/available-transitions");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['value', 'label', 'color', 'timestamp_field'],
                ],
            ]);

        $transitions = $response->json('data');

        // QUALIFIED can transition to PROPOSAL_SENT, LOST, ARCHIVED
        $this->assertCount(3, $transitions);
        $transitionValues = array_column($transitions, 'value');
        $this->assertContains(LeadStatus::PROPOSAL_SENT->value, $transitionValues);
        $this->assertContains(LeadStatus::LOST->value, $transitionValues);
        $this->assertContains(LeadStatus::ARCHIVED->value, $transitionValues);
    }

    /**
     * Test unauthorized user cannot transition lead status
     */
    public function test_unauthorized_user_cannot_transition_status(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        $otherUser = User::factory()->create();

        $response = $this->actingAs($otherUser)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::CONTACTED->value,
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test invalid status value returns proper error
     */
    public function test_invalid_status_value_returns_error(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => 'invalid_status',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /**
     * Test transition updates timestamp correctly
     */
    public function test_transition_updates_timestamp(): void
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::CONTACTED,
            'created_by' => $this->user->id,
            'owner_id' => $this->user->id,
            'pipeline_stage_id' => $this->stage->id,
            'qualified_at' => null, // the factory randomly pre-fills this; make the precondition deterministic
        ]);

        $this->assertNull($lead->qualified_at);

        $this->actingAs($this->user)
            ->postJson("/api/v1/leads/{$lead->id}/transition", [
                'status' => LeadStatus::QUALIFIED->value,
            ])
            ->assertStatus(200);

        $lead->refresh();
        $this->assertNotNull($lead->qualified_at);
        $this->assertEqualsWithDelta(
            now()->timestamp,
            $lead->qualified_at->timestamp,
            5 // within 5 seconds
        );
    }

    /** @test */
    public function test_it_allows_valid_status_transitions()
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'owner_id' => $this->user->id,
        ]);

        // NEW can transition to CONTACTED
        $this->assertTrue($lead->canTransitionTo(LeadStatus::CONTACTED));

        // Update status
        $lead->update(['status' => LeadStatus::CONTACTED]);

        // CONTACTED can transition to QUALIFIED
        $this->assertTrue($lead->canTransitionTo(LeadStatus::QUALIFIED));
    }

    /** @test */
    public function test_it_prevents_invalid_status_transitions()
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'owner_id' => $this->user->id,
        ]);

        // NEW cannot directly transition to WON
        $this->assertFalse($lead->canTransitionTo(LeadStatus::WON));

        // NEW cannot directly transition to PROPOSAL_SENT
        $this->assertFalse($lead->canTransitionTo(LeadStatus::PROPOSAL_SENT));
    }

    /** @test */
    public function test_it_updates_timestamp_fields_on_status_change()
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'owner_id' => $this->user->id,
            'contacted_at' => null,
        ]);

        // Timestamps are maintained by the status service (not by a raw model update)
        app(LeadStatusService::class)->transition($lead, LeadStatus::CONTACTED);

        $this->assertNotNull($lead->fresh()->contacted_at);
    }

    /** @test */
    public function test_it_marks_terminal_statuses_correctly()
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::NEW,
            'owner_id' => $this->user->id,
        ]);

        $this->assertFalse($lead->isTerminal());

        $lead->update(['status' => LeadStatus::WON]);
        $this->assertTrue($lead->isTerminal());

        $lead->update(['status' => LeadStatus::LOST]);
        $this->assertTrue($lead->isTerminal());

        $lead->update(['status' => LeadStatus::ARCHIVED]);
        $this->assertTrue($lead->isTerminal());
    }

    /** @test */
    public function test_terminal_statuses_can_only_transition_to_archived()
    {
        $wonLead = Lead::factory()->create([
            'status' => LeadStatus::WON,
            'owner_id' => $this->user->id,
        ]);

        // WON can only go to ARCHIVED
        $this->assertTrue($wonLead->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertFalse($wonLead->canTransitionTo(LeadStatus::CONTACTED));
        $this->assertFalse($wonLead->canTransitionTo(LeadStatus::QUALIFIED));

        $lostLead = Lead::factory()->create([
            'status' => LeadStatus::LOST,
            'owner_id' => $this->user->id,
        ]);

        // LOST can only go to ARCHIVED
        $this->assertTrue($lostLead->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertFalse($lostLead->canTransitionTo(LeadStatus::WON));
    }

    /** @test */
    public function test_archived_status_cannot_transition_anywhere()
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::ARCHIVED,
            'owner_id' => $this->user->id,
        ]);

        foreach (LeadStatus::cases() as $status) {
            $this->assertFalse(
                $lead->canTransitionTo($status),
                "ARCHIVED should not be able to transition to {$status->value}"
            );
        }
    }

    /** @test */
    public function test_it_returns_correct_allowed_transitions()
    {
        $lead = Lead::factory()->create([
            'status' => LeadStatus::QUALIFIED,
            'owner_id' => $this->user->id,
        ]);

        $allowed = $lead->status->getAllowedTransitions();

        $this->assertCount(3, $allowed);
        $this->assertContains(LeadStatus::PROPOSAL_SENT, $allowed);
        $this->assertContains(LeadStatus::LOST, $allowed);
        $this->assertContains(LeadStatus::ARCHIVED, $allowed);
    }

    /** @test */
    public function test_it_provides_correct_status_labels()
    {
        // Enums cannot be array keys, so use [status, label] pairs
        $statuses = [
            [LeadStatus::NEW, 'New Lead'],
            [LeadStatus::CONTACTED, 'Contacted'],
            [LeadStatus::QUALIFIED, 'Qualified'],
            [LeadStatus::PROPOSAL_SENT, 'Proposal Sent'],
            [LeadStatus::NEGOTIATION, 'In Negotiation'],
            [LeadStatus::WON, 'Won'],
            [LeadStatus::LOST, 'Lost'],
            [LeadStatus::ARCHIVED, 'Archived'],
        ];

        foreach ($statuses as [$status, $expectedLabel]) {
            $this->assertEquals($expectedLabel, $status->label());
        }
    }

    /**
     * @test
     */
    public function test_active_scope_excludes_terminal_statuses()
    {
        Lead::factory()->create(['status' => LeadStatus::NEW, 'owner_id' => $this->user->id]);
        Lead::factory()->create(['status' => LeadStatus::CONTACTED, 'owner_id' => $this->user->id]);
        Lead::factory()->create(['status' => LeadStatus::WON, 'owner_id' => $this->user->id]);
        Lead::factory()->create(['status' => LeadStatus::LOST, 'owner_id' => $this->user->id]);
        Lead::factory()->create(['status' => LeadStatus::ARCHIVED, 'owner_id' => $this->user->id]);

        $activeLeads = Lead::active()->get();

        $this->assertCount(2, $activeLeads);
        $this->assertFalse($activeLeads->contains('status', LeadStatus::WON));
        $this->assertFalse($activeLeads->contains('status', LeadStatus::LOST));
        $this->assertFalse($activeLeads->contains('status', LeadStatus::ARCHIVED));
    }
}
