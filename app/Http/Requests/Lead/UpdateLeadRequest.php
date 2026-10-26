<?php

namespace App\Http\Requests\Lead;

use App\Models\Lead;
use App\Enums\LeadStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        $lead = $this->route('lead');
        return $this->user()->can('update', $lead);
    }

    public function rules(): array
    {
        return [
            'title'             => ['sometimes', 'required', 'string', 'max:255'],
            'description'       => ['nullable', 'string', 'max:5000'],
            'type'              => ['sometimes', 'required', 'in:document,conversation'],
            'owner_id'          => ['sometimes', 'required', 'exists:users,id'],
            'pipeline_stage_id' => ['sometimes', 'required', 'exists:pipeline_stages,id'],
            'status'            => ['sometimes', Rule::enum(LeadStatus::class)],
            'estimated_value'   => ['nullable', 'numeric', 'min:0'],
            'currency'          => ['nullable', 'string', 'size:3', Rule::in(array_keys(Lead::CURRENCIES))],
            'metadata'          => ['nullable', 'array'],
            'metadata.source'   => ['nullable', 'string', 'max:255'],
            'metadata.priority' => ['nullable', 'in:low,medium,high,urgent'],
            'metadata.tags'     => ['nullable', 'array'],
            'metadata.tags.*'   => ['string', 'max:50'],
            'ai_reviewed'       => ['sometimes', 'boolean'],
            'is_starred'        => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required'             => 'A lead title is required.',
            'title.max'                  => 'The lead title must not exceed 255 characters.',
            'type.required'              => 'Please specify the lead type.',
            'type.in'                    => 'The lead type must be either document or conversation.',
            'owner_id.required'          => 'Please assign the lead to an owner.',
            'owner_id.exists'            => 'The selected owner is invalid.',
            'pipeline_stage_id.required' => 'Please select a pipeline stage.',
            'pipeline_stage_id.exists'   => 'The selected pipeline stage is invalid.',
            'currency.in'                => 'Please select a supported currency.',
            'currency.size'              => 'Currency must be a 3-letter ISO code.',
        ];
    }

    public function attributes(): array
    {
        return [
            'owner_id'          => 'lead owner',
            'pipeline_stage_id' => 'pipeline stage',
            'ai_reviewed'       => 'AI reviewed status',
            'currency'          => 'currency',
        ];
    }
}