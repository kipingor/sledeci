<?php

namespace App\Http\Requests\Pipeline;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\PipelineStage;

class MovePipelineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'stage_id' => ['required', 'exists:pipeline_stages,id'],
        ];
    }

    public function stageId(): int
    {
        return $this->input('stage_id');
    }

    public function stage(): PipelineStage
    {
        $stageId = $this->input('stage_id');
        $stageModel = \App\Models\PipelineStage::findOrFail($stageId);
        return PipelineStage::from($stageModel->key);
    }
}
