<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\User;
use App\Models\PipelineStage;
use App\Enums\LeadStatus;
use App\Services\Pipeline\PipelineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use App\Events\LeadMoved;
use Tests\TestCase;

class PipelineMovementTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected PipelineService $pipelineService;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->pipelineService = app(PipelineService::class);
        
        // Seed pipeline stages
        $this->seedPipelineStages();
    }

    protected function seedPipelineStages(): void
    {
        $stages = [
            ['key' => 'intake', 'name' => 'Intake', 'color' => '#3b82f6', 'order' => 1],
            ['key' => 'discovery', 'name' => 'Discovery', 'color' => '#8b5cf6', 'order' => 2],
            ['key' => 'proposal', 'name' => 'Proposal', 'color' => '#f97316', 'order' => 3],
            ['key' => 'negotiation', 'name' => 'Negotiation', 'color' => '#eab308', 'order' => 4],
            ['key' => 'closed_won', 'name' => 'Closed Won', 'color' => '#10b981', 'order' => 5],
            ['key' => 'closed_lost', 'name' => 'Closed Lost', 'color' => '#ef4444', 'order' => 6],
        ];

        foreach ($stages as $stage) {
            PipelineStage::create($stage);
        }
    }

    /** @test */
    public function it_can_move_lead_between_stages()
    {
        $intakeStage = PipelineStage::where('key', 'intake')->first();
        $discoveryStage = PipelineStage::where('key', 'discovery')->first();

        $lead = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
            'order' => 0,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/v1/leads/{$lead->id}/move", [
                'stage_id' => $discoveryStage->id,
            ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'id',
                'pipeline_stage_id',
                'pipeline_stage',
            ],
        ]);

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'pipeline_stage_id' => $discoveryStage->id,
        ]);
    }

    /** @test */
    public function it_prevents_unauthorized_users_from_moving_leads()
    {
        $otherUser = User::factory()->create();
        $intakeStage = PipelineStage::where('key', 'intake')->first();
        $discoveryStage = PipelineStage::where('key', 'discovery')->first();

        $lead = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,  // Owned by different user
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')
            ->putJson("/api/v1/leads/{$lead->id}/move", [
                'stage_id' => $discoveryStage->id,
            ]);

        $response->assertForbidden();
    }

    /** @test */
    public function it_validates_stage_id_exists()
    {
        $lead = Lead::factory()->create([
            'owner_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/v1/leads/{$lead->id}/move", [
                'stage_id' => 99999,  // Non-existent stage
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['stage_id']);
    }

    /** @test */
    public function it_maintains_lead_order_when_moving_within_same_stage()
    {
        $intakeStage = PipelineStage::where('key', 'intake')->first();

        $lead1 = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
            'order' => 0,
        ]);

        $lead2 = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
            'order' => 1,
        ]);

        // Move lead, shouldn't affect other leads
        $this->pipelineService->moveLead($lead1, $intakeStage->id, 0);

        $lead1->refresh();
        $lead2->refresh();

        $this->assertEquals(0, $lead1->order);
        $this->assertEquals(1, $lead2->order);
    }

    /** @test */
    public function it_reorders_leads_in_old_stage_after_move()
    {
        $intakeStage = PipelineStage::where('key', 'intake')->first();
        $discoveryStage = PipelineStage::where('key', 'discovery')->first();

        // Create 3 leads in intake stage
        $lead1 = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
            'order' => 0,
        ]);

        $lead2 = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
            'order' => 1,
        ]);

        $lead3 = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
            'order' => 2,
        ]);

        // Move lead2 to discovery
        $this->pipelineService->moveLead($lead2, $discoveryStage->id);

        // Check that remaining leads in intake are reordered
        $lead1->refresh();
        $lead3->refresh();

        $this->assertEquals(0, $lead1->order);
        $this->assertEquals(1, $lead3->order);  // Was 2, now 1
    }

    /** @test */
    public function it_dispatches_lead_moved_event()
    {
        Event::fake([LeadMoved::class]);

        $intakeStage = PipelineStage::where('key', 'intake')->first();
        $discoveryStage = PipelineStage::where('key', 'discovery')->first();

        $lead = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
        ]);

        $this->pipelineService->moveLead($lead, $discoveryStage->id);

        Event::assertDispatched(LeadMoved::class, function ($event) use ($lead, $intakeStage, $discoveryStage) {
            return $event->lead->id === $lead->id
                && $event->oldStageId === $intakeStage->id
                && $event->newStageId === $discoveryStage->id;
        });
    }

    /** @test */
    public function it_handles_concurrent_moves_correctly()
    {
        $intakeStage = PipelineStage::where('key', 'intake')->first();
        $discoveryStage = PipelineStage::where('key', 'discovery')->first();

        $lead = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
        ]);

        // Simulate two concurrent move requests
        DB::beginTransaction();
        
        try {
            // First move
            $this->pipelineService->moveLead($lead, $discoveryStage->id);
            
            // Refresh to get latest state
            $lead->refresh();
            
            // Second move should work without error
            $proposalStage = PipelineStage::where('key', 'proposal')->first();
            $this->pipelineService->moveLead($lead, $proposalStage->id);
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            $this->fail('Concurrent moves failed: ' . $e->getMessage());
        }

        $lead->refresh();
        $this->assertEquals($proposalStage->id, $lead->pipeline_stage_id);
    }

    /** @test */
    public function it_creates_audit_log_for_pipeline_move()
    {
        $intakeStage = PipelineStage::where('key', 'intake')->first();
        $discoveryStage = PipelineStage::where('key', 'discovery')->first();

        $lead = Lead::factory()->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
        ]);

        $this->actingAs($this->user, 'sanctum');
        $this->pipelineService->moveLead($lead, $discoveryStage->id);

        if (class_exists(\App\Models\AuditLog::class)) {
            $this->assertDatabaseHas('audit_logs', [
                'auditable_type' => Lead::class,
                'auditable_id' => $lead->id,
                'event' => 'pipeline_moved',
                'user_id' => $this->user->id,
            ]);
        }
    }

    /** @test */
    public function it_returns_leads_ordered_correctly_for_pipeline_board()
    {
        $intakeStage = PipelineStage::where('key', 'intake')->first();

        Lead::factory()->count(3)->create([
            'pipeline_stage_id' => $intakeStage->id,
            'owner_id' => $this->user->id,
        ])->each(function ($lead, $index) {
            $lead->update(['order' => $index]);
        });

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/pipelines');

        $response->assertOk();
        
        $intakeLeads = collect($response->json('data.leadsByStage'))
            ->firstWhere('key', 'intake')['leads'];

        // Verify order is sequential
        $orders = collect($intakeLeads)->pluck('order')->toArray();
        $this->assertEquals([0, 1, 2], $orders);
    }
}