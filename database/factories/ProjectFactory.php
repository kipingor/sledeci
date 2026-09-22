<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Project> */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        return [
            'tenant_id'   => Tenant::factory(),
            'name'        => $this->faker->catchPhrase(),
            'code'        => strtoupper($this->faker->bothify('PRJ-###')),
            'description' => $this->faker->optional()->paragraph(),
            'status'      => $this->faker->randomElement(Project::STATUSES),
            'priority'    => $this->faker->randomElement(Project::PRIORITIES),
            'start_date'  => $this->faker->optional()->dateTimeBetween('-1 month', 'now'),
            'due_date'    => $this->faker->optional()->dateTimeBetween('now', '+6 months'),
            'budget'      => $this->faker->optional()->randomFloat(2, 10000, 10000000),
            'currency'    => 'KES',
            'owner_id'    => null,
        ];
    }

    public function forTenant(Tenant|string $tenant): static
    {
        return $this->state(['tenant_id' => $tenant instanceof Tenant ? $tenant->id : $tenant]);
    }

    public function active(): static
    {
        return $this->state(['status' => 'active']);
    }
}