<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\User;
use App\Models\Project;
use App\Models\Milestone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * FIX: Previously created tasks with any random status (including 'done')
 * for any project regardless of project status. This caused progress to show
 * 100% on active projects and broke the "completed only when all tasks done" rule.
 *
 * States:
 *   - pending()   → status = 'todo'    (project in planning/initiating)
 *   - active()    → status in_progress/review (project is active)
 *   - done()      → status = 'done'    (only for completed projects)
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        // Default: in-progress work (active project tasks)
        return [
            'project_id'       => Project::inRandomOrder()->first()?->id ?? Project::factory(),
            'milestone_id'     => $this->faker->boolean(60)
                ? (Milestone::inRandomOrder()->first()?->id ?? null)
                : null,
            'parent_id'        => null,
            'wbs_code'         => null, // set by seeder for clarity
            'sort_order'       => $this->faker->numberBetween(0, 20),
            'title'            => $this->faker->sentence(4),
            'description'      => $this->faker->optional()->paragraph(),
            'assigned_to'      => User::inRandomOrder()->first()?->id ?? null,
            'priority'         => $this->faker->randomElement(['low', 'medium', 'medium', 'high']),
            'status'           => $this->faker->randomElement(['todo', 'in_progress', 'review']),
            'startAt'          => $this->faker->optional()->date(),
            'endAt'            => null,
            'completed_at'     => null,
            'due_date'         => $this->faker->optional()->dateTimeBetween('now', '+3 months'),
            'estimated_hours'  => $this->faker->numberBetween(2, 40),
            'spent_hours'      => $this->faker->numberBetween(0, 20),
            'group'            => $this->faker->randomElement(['frontend', 'backend', 'design', 'qa', 'management']),
            'metadata'         => null,
        ];
    }

    /** Task not started — for planning-phase projects. */
    public function pending(): static
    {
        return $this->state([
            'status'       => 'todo',
            'spent_hours'  => 0,
            'completed_at' => null,
        ]);
    }

    /** Task actively being worked on. */
    public function inProgress(): static
    {
        return $this->state([
            'status'       => $this->faker->randomElement(['in_progress', 'review']),
            'completed_at' => null,
        ]);
    }

    /**
     * Task finished — use ONLY for completed projects.
     * Setting this on an active project will make progress show 100% prematurely.
     */
    public function done(): static
    {
        return $this->state([
            'status'       => 'done',
            'completed_at' => $this->faker->dateTimeBetween('-3 months', 'now'),
            'spent_hours'  => $this->faker->numberBetween(1, 40),
        ]);
    }

    /** Overdue task — due in the past, not done. */
    public function overdue(): static
    {
        return $this->state([
            'status'   => $this->faker->randomElement(['todo', 'in_progress']),
            'due_date' => $this->faker->dateTimeBetween('-2 months', '-1 day'),
            'completed_at' => null,
        ]);
    }
}
