<?php

namespace App\Http\Requests\CRM;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreActivityRequest extends FormRequest
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
            'type'     => ['required', 'in:call,email,meeting,note,task'],
            'subject'  => ['required', 'string', 'max:255'],
            'body'     => ['nullable', 'string', 'max:10000'],
            'due_at'   => ['nullable', 'date'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
