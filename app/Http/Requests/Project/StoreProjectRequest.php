<?php

namespace App\Http\Requests\Project;

use App\Models\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
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
        return $this->rulesForProject();
    }

    /** @return array<string, list<mixed>> */
    private function rulesForProject(): array
    {
        $tenantId = tenancy()->tenant?->getTenantKey();

        return [
            'name'        => ['required', 'string', 'max:255'],
            'code'        => ['nullable', 'string', 'max:30', Rule::unique('projects', 'code')->where('tenant_id', $tenantId)],
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
