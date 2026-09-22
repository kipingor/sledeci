<?php

namespace App\Http\Requests\Project;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $tenantId = tenancy()->tenant?->getTenantKey();
        $projectId = $this->route('project')?->id;

        return [
            'name'        => ['required', 'string', 'max:255'],
            'code'        => ['nullable', 'string', 'max:30', Rule::unique('projects', 'code')->ignore($projectId)->where('tenant_id', $tenantId)],
            'description' => ['nullable', 'string', 'max:10000'],
            'status'      => ['required', Rule::in(Project::STATUSES)],
            'priority'    => ['required', Rule::in(Project::PRIORITIES)],
            'start_date'  => ['nullable', 'date'],
            'due_date'    => ['nullable', 'date', 'after_or_equal:start_date'],
            'budget'      => ['nullable', 'numeric', 'min:0'],
            'currency'    => ['nullable', 'string', 'size:3'],
            'owner_id'    => ['nullable', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
        ];
    }
}
