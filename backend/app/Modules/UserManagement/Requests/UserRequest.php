<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Requests;

use App\Modules\UserManagement\Models\User;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class UserRequest extends FormRequest
{
    /**
     * @return list<string>|null
     */
    public function selectedRoles(): ?array
    {
        return $this->validated('roles');
    }

    /**
     * @return array<string, mixed>
     */
    public function attributesForModel(): array
    {
        $attributes = $this->validated();
        unset($attributes['roles']);

        if (array_key_exists('status', $attributes)) {
            $attributes['is_active'] = ActiveStatus::from($attributes['status'])->toBoolean();
            unset($attributes['status']);
        }

        return $attributes;
    }

    /**
     * @return array<string, mixed>
     */
    protected function roleRules(): array
    {
        return [
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['string', 'distinct', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ];
    }

    /**
     * @return list<mixed>
     */
    protected function usernameRules(?int $ignoredUserId = null): array
    {
        return [
            'sometimes',
            'nullable',
            'string',
            'min:3',
            'max:50',
            'regex:'.User::USERNAME_PATTERN,
            Rule::unique('users', 'username')->ignore($ignoredUserId),
        ];
    }
}
