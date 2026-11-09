<?php

declare(strict_types=1);

namespace App\Core\Authentication\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class ChangePasswordRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'max:1024', 'current_password:web'],
            'password' => [
                'required',
                'string',
                'max:1024',
                'confirmed',
                'different:current_password',
                Password::defaults(),
            ],
        ];
    }
}
