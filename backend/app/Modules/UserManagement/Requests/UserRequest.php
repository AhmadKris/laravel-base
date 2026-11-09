<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Requests;

use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

abstract class UserRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function attributesForModel(): array
    {
        $attributes = $this->validated();

        if (array_key_exists('department_id', $attributes) && $attributes['department_id'] !== null) {
            $attributes['department_id'] = Department::query()->where('uuid', $attributes['department_id'])->value('id');
        }

        if (array_key_exists('status', $attributes)) {
            $attributes['is_active'] = ActiveStatus::from($attributes['status'])->toBoolean();
            unset($attributes['status']);
        }

        return $attributes;
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

    protected function existingDepartment(): Exists
    {
        return Rule::exists('departments', 'uuid')->whereNull('deleted_at');
    }
}
