<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Lead;
use App\Enums\PipelineStage;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PipelineAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_move_pipeline_for_unowned_lead(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $proposal_stage = DB::table('pipeline_stages')
            ->where('key', PipelineStage::PROPOSAL->value)
            ->value('id');

        $lead = Lead::factory()->create([
            'owner_id' => $owner->id,
            'created_by' => $owner->id,
            'pipeline_stage_id' => $proposal_stage,
        ]);

        $this->actingAs($intruder)
            ->putJson("/api/v1/leads/{$lead->id}/move", [
                'stage_id' => $proposal_stage,
            ])
            ->assertForbidden();
    }
}