<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Laravel\Fortify\InteractsWithTwoFactorState;

/**
 * Used by the security settings page, which must render (without the two-factor
 * section) even when two-factor authentication is disabled.
 */
class SecurityEditRequest extends FormRequest
{
    use InteractsWithTwoFactorState;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }
}
