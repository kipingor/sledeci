<?php

namespace App\Http\Requests\Careers;

use App\Models\JobPosting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveJobPostingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // authorised in the controller through JobPostingPolicy
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:190'],
            'department' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:190'],
            'is_remote' => ['boolean'],
            'employment_type' => ['required', Rule::in(array_keys(JobPosting::EMPLOYMENT_TYPES))],
            'experience_level' => ['nullable', Rule::in(array_keys(JobPosting::EXPERIENCE_LEVELS))],
            'summary' => ['nullable', 'string', 'max:500'],
            'description' => ['required', 'string', 'max:20000'],
            'responsibilities' => ['nullable', 'string', 'max:10000'],
            'requirements' => ['nullable', 'string', 'max:10000'],
            'benefits' => ['nullable', 'string', 'max:10000'],
            'salary_min' => ['nullable', 'numeric', 'min:0'],
            'salary_max' => ['nullable', 'numeric', 'min:0', 'gte:salary_min'],
            'salary_currency' => ['nullable', 'string', 'size:3'],
            'closes_at' => ['nullable', 'date'],
        ];
    }
}
