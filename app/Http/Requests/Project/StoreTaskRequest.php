<?php

namespace App\Http\Requests\Project;

use Illuminate\Contracts\Validation\ValidationRule;
use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
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

        return [
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:10000'],
            'status'         => ['required', Rule::in(Task::STATUSES)],
            'priority'       => ['required', Rule::in(Task::PRIORITIES)],
            'start_date'     => ['nullable', 'date'],
            'due_date'       => ['nullable', 'date', 'after_or_equal:start_date'],
            'assignee_id'    => ['nullable', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'parent_task_id' => ['nullable', Rule::exists('tasks', 'id')->where('tenant_id', $tenantId)->where('project_id', $this->route('project')?->id)],
        ];
    }
}
