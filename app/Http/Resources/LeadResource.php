<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'created_by' => $this->created_by,
            'owner_id' => $this->owner_id,
            'pipeline_stage_id' => $this->pipeline_stage_id,
            'order' => $this->order,
            'metadata' => $this->metadata,
            'ai_reviewed' => $this->ai_reviewed,
            'is_starred' => $this->is_starred,
            'estimated_value' => $this->estimated_value,
            
            // Timestamps
            'contacted_at' => $this->contacted_at?->toISOString(),
            'qualified_at' => $this->qualified_at?->toISOString(),
            'proposal_sent_at' => $this->proposal_sent_at?->toISOString(),
            'negotiation_started_at' => $this->negotiation_started_at?->toISOString(),
            'converted_to_opportunity_at' => $this->converted_to_opportunity_at?->toISOString(),
            'won_at' => $this->won_at?->toISOString(),
            'lost_at' => $this->lost_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
            
            // Relationships (loaded when available)
            'owner' => $this->whenLoaded('owner', fn() => [
                'id' => $this->owner->id,
                'name' => $this->owner->name,
                'email' => $this->owner->email,
                'avatar' => $this->owner->avatar,
            ]),
            'pipeline_stage' => $this->whenLoaded('pipelineStage', fn() => [
                'id' => $this->pipelineStage->id,
                'key' => $this->pipelineStage->key,
                'name' => $this->pipelineStage->name,
                'color' => $this->pipelineStage->color,
                'order' => $this->pipelineStage->order,
            ]),
            'questions' => $this->whenLoaded('questions'),
            'lead_documents' => $this->whenLoaded('leadDocuments'),
            'opportunity' => $this->whenLoaded('opportunity'),
            'proposals' => $this->whenLoaded('proposals'),
            'activities' => $this->whenLoaded('activities'),
        ];
    }
}