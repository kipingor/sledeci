<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'user' => new UserResource($this->whenLoaded('user')),
            'commentable' => [
                'type' => $this->commentable_type,
                'id' => $this->commentable_id,
            ],
            'metadata' => $this->metadata,
            'created_at' => $this->created_at,
        ];
    }
}
