<?php

namespace App\Http\Requests\Lead;

use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitionLeadStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $lead = $this->route('lead');
        return $this->user()->can('update', $lead);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => [
                'bail', // stop at the first failure so the closure never sees an invalid enum value
                'required',
                'string',
                Rule::enum(LeadStatus::class),
                function ($attribute, $value, $fail) {
                    $lead = $this->route('lead');
                    $newStatus = LeadStatus::tryFrom((string) $value);

                    if ($newStatus === null) {
                        return;
                    }

                    if (!$lead->status->canTransitionTo($newStatus)) {
                        $fail("Cannot transition from {$lead->status->label()} to {$newStatus->label()}");
                    }
                },
            ],
            'reason' => [
                // Closure rules are skipped for empty values, so use requiredIf to enforce this.
                Rule::requiredIf(fn () => $this->input('status') === LeadStatus::LOST->value),
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'status.required' => 'Please select a status',
            'status.enum' => 'The selected status is invalid',
            'reason.required' => 'A reason is required when marking a lead as lost.',
            'reason.max' => 'The reason must not exceed 1000 characters',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'status' => 'status',
            'reason' => 'lost reason',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        $lead = $this->route('lead');
        
        // Add allowed transitions to error response
        if ($this->expectsJson()) {
            $errors = $validator->errors();
            
            if ($errors->has('status')) {
                $response = response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => $errors->toArray(),
                    'details' => [
                        'current_status' => [
                            'value' => $lead->status->value,
                            'label' => $lead->status->label(),
                        ],
                        'allowed_transitions' => array_map(
                            fn ($status) => [
                                'value' => $status->value,
                                'label' => $status->label(),
                                'color' => $status->color(),
                            ],
                            $lead->status->getAllowedTransitions()
                        ),
                    ],
                ], 422);

                throw new \Illuminate\Validation\ValidationException($validator, $response);
            }
        }

        parent::failedValidation($validator);
    }
}
