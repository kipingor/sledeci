<?php

namespace App\Http\Requests\CRM;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
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
            'name'     => ['required', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:100'],
            'website'  => ['nullable', 'url', 'max:255'],
            'phone'    => ['nullable', 'string', 'max:30'],
            'email'    => ['nullable', 'email', 'max:255'],
            'address'  => ['nullable', 'string', 'max:500'],
            'notes'    => ['nullable', 'string', 'max:5000'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
