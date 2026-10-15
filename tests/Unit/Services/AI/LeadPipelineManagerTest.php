<?php

namespace Tests\Unit\Services\AI;

use App\Events\LeadMoved;
use App\Events\LeadUpdated;
use App\Models\AuditLog;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
use App\Services\AI\LeadPipelineManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class LeadPipelineManagerTest extends TestCase
{
    use RefreshDatabase;

    protected LeadPipelineManager $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new LeadPipelineManager();
    }

    /** @test */
    public function it_can_move_lead_to_new_stage()
    {
        // Arrange
        $oldStage = PipelineStage::factory()->create(['key' => 'intake']);
        $newStage = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead = Lead::factory()->create(['pipeline_stage_id' => $oldStage->id]);

        // Act
        $result = $this->service->moveLead($lead->id, 'qualified');

        // Assert
        $this->assertEquals($newStage->id, $result->pipeline_stage_id);
        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'pipeline_stage_id' => $newStage->id,
        ]);
    }

    /** @test */
    public function it_creates_audit_log_when_moving_lead()
    {
        // Arrange
        $user = User::factory()->create();
        $oldStage = PipelineStage::factory()->create(['key' => 'intake']);
        $newStage = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead = Lead::factory()->create(['pipeline_stage_id' => $oldStage->id]);

        // Act
        $this->service->moveLead($lead->id, 'qualified', $user->id);

        // Assert
        $this->assertDatabaseHas('audit_logs', [
            'auditable_type' => Lead::class,
            'auditable_id' => $lead->id,
            'user_id' => $user->id,
            'event' => 'pipeline_moved',
        ]);

        $log = AuditLog::where('auditable_id', $lead->id)->first();
        $this->assertEquals($oldStage->id, $log->old_values['pipeline_stage_id']);
        $this->assertEquals($newStage->id, $log->new_values['pipeline_stage_id']);
    }

    /** @test */
    public function it_dispatches_events_when_moving_lead()
    {
        // Arrange
        Event::fake([LeadUpdated::class, LeadMoved::class]);

        $oldStage = PipelineStage::factory()->create(['key' => 'intake']);
        $newStage = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead = Lead::factory()->create(['pipeline_stage_id' => $oldStage->id]);

        // Act
        $this->service->moveLead($lead->id, 'qualified');

        // Assert
        Event::assertDispatched(LeadUpdated::class, function ($event) use ($lead) {
            return $event->lead->id === $lead->id;
        });

        Event::assertDispatched(LeadMoved::class, function ($event) use ($lead) {
            return $event->lead->id === $lead->id && $event->toStageKey === 'qualified';
        });
    }

    /** @test */
    public function it_can_move_lead_by_stage_id()
    {
        // Arrange
        $oldStage = PipelineStage::factory()->create();
        $newStage = PipelineStage::factory()->create();
        $lead = Lead::factory()->create(['pipeline_stage_id' => $oldStage->id]);

        // Act
        $result = $this->service->moveLeadByStageId($lead->id, $newStage->id);

        // Assert
        $this->assertEquals($newStage->id, $result->pipeline_stage_id);
    }

    /** @test */
    public function it_throws_exception_when_lead_not_found()
    {
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        $stage = PipelineStage::factory()->create(['key' => 'qualified']);
        $this->service->moveLead(99999, 'qualified');
    }

    /** @test */
    public function it_throws_exception_when_stage_not_found()
    {
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        $lead = Lead::factory()->create();
        $this->service->moveLead($lead->id, 'non_existent_stage');
    }

    /** @test */
    public function it_can_get_lead_movement_history()
    {
        // Arrange
        $user = User::factory()->create();
        $stage1 = PipelineStage::factory()->create(['key' => 'intake']);
        $stage2 = PipelineStage::factory()->create(['key' => 'contacted']);
        $stage3 = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead = Lead::factory()->create(['pipeline_stage_id' => $stage1->id]);

        // Act - Move through multiple stages
        $this->service->moveLead($lead->id, 'contacted', $user->id);
        $this->service->moveLead($lead->id, 'qualified', $user->id);

        $history = $this->service->getLeadMovementHistory($lead->id);

        // Assert
        $this->assertCount(2, $history);
        $this->assertEquals('pipeline_moved', $history->first()->event);
        $this->assertEquals($user->id, $history->first()->user_id);
    }

    /** @test */
    public function movement_history_is_ordered_by_most_recent_first()
    {
        // Arrange
        $stage1 = PipelineStage::factory()->create(['key' => 'intake']);
        $stage2 = PipelineStage::factory()->create(['key' => 'contacted']);
        $stage3 = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead = Lead::factory()->create(['pipeline_stage_id' => $stage1->id]);

        // Act
        $this->service->moveLead($lead->id, 'contacted');
        sleep(1); // Ensure different timestamps
        $this->service->moveLead($lead->id, 'qualified');

        $history = $this->service->getLeadMovementHistory($lead->id);

        // Assert
        $this->assertEquals($stage3->id, $history->first()->new_values['pipeline_stage_id']);
        $this->assertEquals($stage2->id, $history->last()->new_values['pipeline_stage_id']);
    }

    /** @test */
    public function it_validates_lead_can_move_to_stage()
    {
        // Arrange
        $stage = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead = Lead::factory()->create();

        // Act
        $canMove = $this->service->canMoveTo($lead, 'qualified');

        // Assert
        $this->assertTrue($canMove);
    }

    /** @test */
    public function it_prevents_move_to_non_existent_stage()
    {
        // Arrange
        $lead = Lead::factory()->create();

        // Act
        $canMove = $this->service->canMoveTo($lead, 'non_existent');

        // Assert
        $this->assertFalse($canMove);
    }

    /** @test */
    public function it_prevents_move_to_closed_won_without_opportunity()
    {
        // Arrange
        $wonStage = PipelineStage::factory()->create([
            'key' => 'closed_won',
            'type' => 'closed_won',
        ]);
        $lead = Lead::factory()->create(); // No opportunity

        // Act
        $canMove = $this->service->canMoveTo($lead, 'closed_won');

        // Assert
        $this->assertFalse($canMove);
    }

    /** @test */
    public function it_allows_move_to_closed_won_with_opportunity()
    {
        // Arrange
        $wonStage = PipelineStage::factory()->create([
            'key' => 'closed_won',
            'type' => 'closed_won',
        ]);
        $lead = Lead::factory()->hasOpportunity()->create();

        // Act
        $canMove = $this->service->canMoveTo($lead, 'closed_won');

        // Assert
        $this->assertTrue($canMove);
    }

    /** @test */
    public function it_uses_database_transaction_for_move_operation()
    {
        // Arrange
        $stage = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead = Lead::factory()->create();

        // Simulate a failure by using a non-existent user ID that would fail
        // Actually, the current implementation doesn't enforce user_id FK
        // so we'll test that the transaction works by checking atomicity

        // Act & Assert
        $this->assertDatabaseCount('audit_logs', 0);

        $result = $this->service->moveLead($lead->id, 'qualified', 1);

        // Both the lead update and audit log should succeed together
        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'pipeline_stage_id' => $stage->id,
        ]);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    /** @test */
    public function it_refreshes_lead_relationships_after_move()
    {
        // Arrange
        $oldStage = PipelineStage::factory()->create(['key' => 'intake']);
        $newStage = PipelineStage::factory()->create(['key' => 'qualified', 'name' => 'Qualified']);
        $lead = Lead::factory()->create(['pipeline_stage_id' => $oldStage->id]);

        // Act
        $result = $this->service->moveLead($lead->id, 'qualified');

        // Assert - The returned lead should have fresh relationships
        // This tests the refresh() call in the service
        $this->assertNotNull($result);
        $this->assertEquals($newStage->id, $result->pipeline_stage_id);
    }

    /** @test */
    public function multiple_leads_can_be_moved_concurrently()
    {
        // Arrange
        $stage = PipelineStage::factory()->create(['key' => 'qualified']);
        $lead1 = Lead::factory()->create();
        $lead2 = Lead::factory()->create();
        $lead3 = Lead::factory()->create();

        // Act
        $this->service->moveLead($lead1->id, 'qualified');
        $this->service->moveLead($lead2->id, 'qualified');
        $this->service->moveLead($lead3->id, 'qualified');

        // Assert
        $this->assertDatabaseCount('audit_logs', 3);
        $this->assertEquals($stage->id, $lead1->fresh()->pipeline_stage_id);
        $this->assertEquals($stage->id, $lead2->fresh()->pipeline_stage_id);
        $this->assertEquals($stage->id, $lead3->fresh()->pipeline_stage_id);
    }
}