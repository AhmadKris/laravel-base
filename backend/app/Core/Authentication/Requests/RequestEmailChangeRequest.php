<?php

declare(strict_types=1);

namespace App\Core\Authentication\Requests;

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class RequestEmailChangeRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => User::normalizeIdentifier($this->input('email'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->user();

        return [
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::notIn([$user->email]),
                Rule::unique('users', 'email'),
            ],
            // Someone using a session left open must not be able to move the account to their own address.
            'current_password' => ['required', 'string', 'max:1024', 'current_password:web'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.not_in' => 'Email baru sama dengan email Anda saat ini.',
        ];
    }
}
