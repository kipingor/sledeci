<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TimeLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TimeLogFactory extends Factory
{
    protected $model = TimeLog::class;

    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),            // auto-create task if not provided
            'user_id' => User::factory(),            // auto-create user if not provided
            'project_id' => function (array $attributes) {
                return Task::find($attributes['task_id'])->project_id ?? null;
            },
            'started_at' => $this->faker->dateTimeBetween('-30 days', 'now'),
            'ended_at' => function (array $attributes) {
                return $attributes['started_at']->copy()->addMinutes($this->faker->numberBetween(30, 480)); // 0.5 to 8 hours later
            },
            'notes' => $this->faker->optional()->sentence(),
        ];
    }
}
