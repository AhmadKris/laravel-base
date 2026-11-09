<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Requests;

use App\Modules\UserManagement\Models\User;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Validation\Rule;

final class UpdateUserRequest extends UserRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->route('user');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'username' => $this->usernameRules($user->id),
            'status' => ['sometimes', Rule::enum(ActiveStatus::class)],
            'department_id' => ['sometimes', 'nullable', 'uuid', $this->existingDepartment()],
        ];
    }
}
