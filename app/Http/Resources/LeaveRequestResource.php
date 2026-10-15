<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LeaveRequestResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'staff' => new StaffProfileResource($this->whenLoaded('staffProfile')),
            'from_date' => $this->from_date,
            'to_date' => $this->to_date,
            'type' => $this->type,
            'reason' => $this->reason,
            'status' => $this->status,
            'approved_by' => $this->approved_by,
            'admin_notes' => $this->admin_notes,
        ];
    }
}
