<?php

namespace Database\Factories;

use App\Models\Opportunity;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Opportunity>
 */
class OpportunityFactory extends Factory
{
    protected $model = Opportunity::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $stage = $this->faker->randomElement(['qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']);

        return [
            'lead_id' => Lead::query()->inRandomOrder()->first()?->id ?? Lead::factory(),
            'title' => $this->faker->sentence(3),
            'summary' => $this->faker->paragraph,
            'estimated_value' => $this->faker->randomFloat(2, 5000, 200000),
            'currency' => $this->faker->randomElement(['USD', 'EUR', 'GBP', 'KES']),
            'stage' => $stage,
            'owner_id' => User::query()->inRandomOrder()->first()?->id ?? User::factory(),
            'expected_close_date' => $this->faker->dateTimeBetween('+1 week', '+6 months'),
            'ai_suggestions' => $this->faker->boolean(30) ? json_encode([
                'suppliers' => [
                    $this->faker->company,
                    $this->faker->company,
                ],
                'notes' => $this->faker->sentence
            ]) : null,
        ];
    }
}
