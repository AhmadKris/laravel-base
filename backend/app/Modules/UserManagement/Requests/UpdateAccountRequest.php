<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The profile fields a user may change on their own account. Email has its own confirmed flow,
 * and username, status, and roles stay with administrators.
 */
final class UpdateAccountRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30', 'regex:/^\+?[0-9][0-9 ().-]{4,29}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.regex' => 'Telepon hanya boleh berisi angka, spasi, tanda kurung, titik, tanda hubung, dan + di awal.',
        ];
    }
}
