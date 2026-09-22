<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
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
        return [
            'name'      => ['required', 'string', 'max:255'],
            'subdomain' => [
                'required',
                'string',
                'max:63',
                'regex:/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/',
                Rule::unique('tenants', 'slug'),
            ],
            'plan' => ['nullable', 'string', Rule::in(['starter', 'growth', 'enterprise'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'subdomain.regex' => 'Subdomain may only contain lowercase letters, numbers, and hyphens.',
            'subdomain.unique' => 'That subdomain is already taken.',
        ];
    }
}
