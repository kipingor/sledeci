<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\User;
use App\Models\PipelineStage;
use App\Enums\LeadStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Lead>
 */
class LeadFactory extends Factory
{
    protected $model = Lead::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // pick an existing pipeline stage or create one if none exist
        $pipelineStage = PipelineStage::inRandomOrder()->first() ?? PipelineStage::factory()->create();

        $createdBy = User::inRandomOrder()->first()?->id ?? User::factory()->create()->id;
        $ownerId = User::inRandomOrder()->first()?->id ?? User::factory()->create()->id;

        return [
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'estimated_value' => $this->faker->randomFloat(2, 1000, 100000),
            'currency' => $this->faker->randomElement(array_keys(Lead::CURRENCIES)),
            'type' => $this->faker->randomElement(['document', 'conversation']),
            'status' => $this->faker->randomElement([
                LeadStatus::NEW->value, 
                LeadStatus::CONTACTED->value, 
                LeadStatus::QUALIFIED->value, 
                LeadStatus::PROPOSAL_SENT->value, 
                LeadStatus::NEGOTIATION->value, 
                LeadStatus::WON->value, 
                LeadStatus::LOST->value, 
                LeadStatus::ARCHIVED->value
            ]),
            'created_by' => $createdBy,
            'owner_id' => $ownerId,
            'pipeline_stage_id' => $pipelineStage->id,
            'order' => $this->faker->randomNumber(1,8),
            'metadata' => [
                'requirements' => $this->faker->sentences(2, true),
                'summary' => $this->faker->sentence(),
            ],
            'ai_reviewed' => $this->faker->boolean(50),
            'is_starred' => $this->faker->boolean(20),
            'contacted_at' => $this->faker->optional()->dateTimeBetween('-2 months', 'now'),
            'qualified_at' => $this->faker->optional()->dateTimeBetween('-2 months', 'now'),
            'proposal_sent_at' => $this->faker->optional()->dateTimeBetween('-2 months', 'now'),
            'negotiation_started_at' => $this->faker->optional()->dateTimeBetween('-2 months', 'now'),
            'won_at' => $this->faker->optional()->dateTimeBetween('-2 months', 'now'),
            'lost_at' => $this->faker->optional()->dateTimeBetween('-2 months', 'now'),
            'archived_at' => $this->faker->optional(0.2)->dateTimeBetween('-2 months', 'now'),
        ];
    }
}
