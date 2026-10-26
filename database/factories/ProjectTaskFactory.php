<?php

namespace Database\Factories;

use App\Models\ProjectTask;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectTaskFactory extends Factory
{
    protected $model = ProjectTask::class;

    public function definition()
    {
        return [
            'project_id' => Project::factory(),
            'task_id' => Task::factory(),
            'assigned_by' => User::factory(),
            'assigned_at' => now(),
        ];
    }
}
