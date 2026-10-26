<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * FIX: Previously used random status including 'completed' regardless of task state.
 * Progress/completion is now driven by task status in the seeder — the factory
 * itself creates only 'planning' or 'active' projects by default.
 * Use the 'completed' and 'cancelled' states explicitly when needed.
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        // Default to active work states — 'completed' only via state method
        $status = $this->faker->randomElement(['planning', 'active', 'active', 'active']);
        $startDate = $this->faker->dateTimeBetween('-6 months', 'now');
        $endDate = $this->faker->dateTimeBetween($startDate, '+6 months');

        return [
            'opportunity_id' => null,
            'name' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->paragraph(),
            'objectives' => $this->faker->optional()->sentence(),
            'client_id' => User::factory()->create(
                ['is_client' => true,
                    'client_since' => $this->faker->dateTimeBetween('-5 years', '-1 month')]
            )->id,
            'owner_id' => User::where('is_client', false)->inRandomOrder()->first()?->id ?? User::factory()->create()->id,
            'status' => $status,
            'phase' => $this->faker->randomElement(['planning', 'executing', 'monitoring_controlling']),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'budget' => $this->faker->optional(0.8)->randomFloat(2, 5000, 200000),
            'currency' => 'USD',
            'metadata' => null,
        ];
    }

    /**
     * Project where ALL tasks are done → status = 'completed', phase = 'closing'.
     * Use this state in the seeder when you want a genuinely completed project.
     */
    public function completed(): static
    {
        return $this->state([
            'status' => 'completed',
            'phase' => 'closing',
            'completed_at' => $this->faker->dateTimeBetween('-3 months', 'now'),
        ]);
    }

    /** On hold — no tasks should be in progress. */
    public function onHold(): static
    {
        return $this->state(['status' => 'on_hold', 'phase' => 'monitoring_controlling']);
    }

    /** Cancelled — tasks not relevant. */
    public function cancelled(): static
    {
        return $this->state(['status' => 'cancelled', 'phase' => 'closing']);
    }

    /** Just starting — no tasks done yet. */
    public function planning(): static
    {
        return $this->state(['status' => 'planning', 'phase' => 'initiating']);
    }
}
