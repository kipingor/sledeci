<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProjectMilestoneResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'project_id' => $this->project_id,
            'milestone_id' => $this->milestone_id,
            'assigned_at' => $this->assigned_at,
        ];
    }
}
