<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Milestone;
use Illuminate\Database\Eloquent\Factories\Factory;

class MilestoneFactory extends Factory
{
    protected $model = Milestone::class;

    public function definition(): array
    {
        $status = $this->faker->randomElement(['pending', 'achieved', 'overdue']);

        return [
            'project_id' => Project::inRandomOrder()->first()?->id ?? Project::factory(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->paragraph(),
            'due_date' => $this->faker->optional()->dateTimeBetween('+1 week', '+3 months'),
            'status' => $status,
        ];
    }
}
