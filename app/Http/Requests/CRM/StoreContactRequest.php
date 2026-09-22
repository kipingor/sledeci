<?php

namespace App\Http\Requests\CRM;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
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
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['nullable', 'string', 'max:100'],
            'email'      => ['nullable', 'email', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:30'],
            'job_title'  => ['nullable', 'string', 'max:150'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'stage'      => ['required', 'in:lead,prospect,customer,churned'],
            'source'     => ['required', 'in:website,referral,social,email,phone,event,other'],
            'notes'      => ['nullable', 'string', 'max:5000'],
            'owner_id'   => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
