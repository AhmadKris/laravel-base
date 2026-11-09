<?php

declare(strict_types=1);

namespace App\Modules\Department\Requests;

use App\Shared\Enums\ActiveStatus;
use Illuminate\Validation\Rule;

final class StoreDepartmentRequest extends DepartmentRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('departments', 'code')],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', $this->existingParent()],
            'status' => ['sometimes', Rule::enum(ActiveStatus::class)],
        ];
    }
}
