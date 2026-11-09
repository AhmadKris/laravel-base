<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Requests;

use App\Shared\Enums\ActiveStatus;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

final class StoreUserRequest extends UserRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'username' => $this->usernameRules(),
            'password' => ['required', 'string', 'max:1024', Password::defaults()],
            'status' => ['sometimes', Rule::enum(ActiveStatus::class)],
            'department_id' => ['sometimes', 'nullable', 'uuid', $this->existingDepartment()],
        ];
    }
}
