<?php

declare(strict_types=1);

namespace App\Modules\Department\Requests;

use App\Modules\Department\Models\Department;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

abstract class DepartmentRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function attributesForModel(): array
    {
        $attributes = $this->validated();

        if (array_key_exists('parent_id', $attributes) && $attributes['parent_id'] !== null) {
            $attributes['parent_id'] = Department::query()->where('uuid', $attributes['parent_id'])->value('id');
        }

        if (array_key_exists('status', $attributes)) {
            $attributes['is_active'] = ActiveStatus::from($attributes['status'])->toBoolean();
            unset($attributes['status']);
        }

        return $attributes;
    }

    protected function existingParent(): Exists
    {
        return Rule::exists('departments', 'uuid')->whereNull('deleted_at');
    }
}
