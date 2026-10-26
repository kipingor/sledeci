<?php

namespace Database\Factories;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectMilestoneFactory extends Factory
{
    protected $model = ProjectMilestone::class;

    public function definition()
    {
        return [
            'project_id' => Project::factory(),
            'milestone_id' => Milestone::factory(),
            'assigned_at' => now(),
        ];
    }
}
