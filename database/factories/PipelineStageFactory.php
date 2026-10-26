<?php

namespace Database\Factories;

use App\Models\PipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PipelineStage>
 */
class PipelineStageFactory extends Factory
{
    protected $model = PipelineStage::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Common CRM pipeline stages
        $stageKeys = [
            ['key' => 'new', 'name' => 'New', 'order' => 0],
            ['key' => 'contacted', 'name' => 'Contacted', 'order' => 1],
            ['key' => 'qualified', 'name' => 'Qualified', 'order' => 2],
            ['key' => 'opportunity', 'name' => 'Opportunity', 'order' => 3],
            ['key' => 'proposal_sent', 'name' => 'Proposal Sent', 'order' => 4],
            ['key' => 'won', 'name' => 'Won', 'order' => 5],
            ['key' => 'lost', 'name' => 'Lost', 'order' => 6],
        ];

        $stage = $this->faker->randomElement($stageKeys);

        return [
            'key' => $stage['key'],
            'name' => $stage['name'],
            'order' => $stage['order'],
        ];
    }
}
