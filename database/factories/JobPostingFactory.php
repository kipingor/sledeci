<?php

namespace Database\Factories;

use App\Models\JobPosting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobPosting>
 */
class JobPostingFactory extends Factory
{
    protected $model = JobPosting::class;

    public function definition(): array
    {
        return [
            'title' => fake()->unique()->jobTitle(),
            'department' => fake()->randomElement(['Finance', 'Engineering', 'Sales']),
            'location' => 'Nairobi',
            'is_remote' => false,
            'employment_type' => 'full_time',
            'experience_level' => 'mid',
            'summary' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'status' => JobPosting::STATUS_PUBLISHED,
            'published_at' => now()->subDay(),
            'salary_currency' => 'KES',
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => JobPosting::STATUS_DRAFT, 'published_at' => null]);
    }

    public function closed(): static
    {
        return $this->state(['status' => JobPosting::STATUS_CLOSED]);
    }

    public function expired(): static
    {
        return $this->state(['closes_at' => now()->subDay()->toDateString()]);
    }
}
