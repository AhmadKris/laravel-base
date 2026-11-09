<?php

declare(strict_types=1);

namespace App\Modules\Department\Requests;

use App\Modules\Department\Models\Department;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Validation\Rule;

final class UpdateDepartmentRequest extends DepartmentRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Department $department */
        $department = $this->route('department');

        return [
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('departments', 'code')->ignore($department->id)],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', $this->existingParent()],
            'status' => ['sometimes', Rule::enum(ActiveStatus::class)],
        ];
    }
}
