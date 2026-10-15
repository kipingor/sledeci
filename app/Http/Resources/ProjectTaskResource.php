<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProjectTaskResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'project_id' => $this->project_id,
            'task_id' => $this->task_id,
            'assigned_by' => $this->assigned_by,
            'assigned_at' => $this->assigned_at,
        ];
    }
}
