<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'event' => $this->event,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'user' => new UserResource($this->whenLoaded('user')),
            'timestamp' => $this->created_at,
        ];
    }
}
