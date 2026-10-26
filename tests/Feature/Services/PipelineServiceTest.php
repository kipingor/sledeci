<?php

namespace Tests\Feature\Services;

use Tests\TestCase;
use App\Models\Lead;
use App\Models\User;
use App\Models\PipelineStage as PipelineStageModel;
use App\Services\Pipeline\PipelineService;
use App\Enums\PipelineStage;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PipelineServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_moves_a_lead_to_a_new_pipeline_stage(): void
    {
        $user = User::factory()->create();
        $intake = PipelineStageModel::factory()->create([
            'key' => PipelineStage::INTAKE->value,
            'name' => 'Intake',
            'order' => 2,
        ]);

        $discovery = PipelineStageModel::factory()->create([
            'key' => PipelineStage::DISCOVERY->value,
            'name' => 'Discovery',
            'order' => 3,
        ]);

        $lead = Lead::factory()->create([
            'created_by' => $user->id,
            'owner_id' => $user->id,
            'pipeline_stage_id' => $intake->id,
        ]);

        $service = app(PipelineService::class);
        $service->moveLead($lead, $discovery->id, $discovery->order);

        $this->assertEquals(
            $discovery->id,
            $lead->fresh()->pipeline_stage_id
        );
    }
}
