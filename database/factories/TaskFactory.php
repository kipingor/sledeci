<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Task;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Task> */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'tenant_id'      => Tenant::factory(),
            'project_id'     => Project::factory(),
            'parent_task_id' => null,
            'title'          => $this->faker->sentence(5),
            'description'    => $this->faker->optional()->paragraph(),
            'status'         => $this->faker->randomElement(Task::STATUSES),
            'priority'       => $this->faker->randomElement(Task::PRIORITIES),
            'start_date'     => null,
            'due_date'       => $this->faker->optional()->dateTimeBetween('now', '+2 months'),
            'completed_at'   => null,
            'assignee_id'    => null,
            'created_by'     => null,
        ];
    }

    public function forTenant(Tenant|string $tenant): static
    {
        return $this->state(['tenant_id' => $tenant instanceof Tenant ? $tenant->id : $tenant]);
    }

    public function forProject(Project $project): static
    {
        return $this->state(['tenant_id' => $project->tenant_id, 'project_id' => $project->id]);
    }

    public function done(): static
    {
        return $this->state(['status' => 'done', 'completed_at' => now()]);
    }
}
