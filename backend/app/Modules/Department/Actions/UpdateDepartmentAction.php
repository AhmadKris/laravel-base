<?php

declare(strict_types=1);

namespace App\Modules\Department\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class UpdateDepartmentAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws ValidationException
     */
    public function execute(Department $department, array $attributes, User $actor): Department
    {
        DB::transaction(function () use ($department, $attributes, $actor): void {
            if (isset($attributes['parent_id'])) {
                $this->assertNotCircular($department, $attributes['parent_id']);
            }

            $original = $department->getAttributes();
            $department->update($attributes);

            $changed = Arr::except($department->getChanges(), ['updated_at']);

            if ($changed !== []) {
                $this->auditLogger->record('department.updated', $department, [
                    'old' => Arr::only($original, array_keys($changed)),
                    'new' => $changed,
                ], $actor);
            }
        });

        return $department;
    }

    /**
     * Ancestors are locked so two concurrent moves cannot close a cycle between them.
     *
     * @throws ValidationException
     */
    private function assertNotCircular(Department $department, int $parentId): void
    {
        $ancestorId = $parentId;

        while ($ancestorId !== null) {
            if ($ancestorId === $department->id) {
                throw ValidationException::withMessages([
                    'parent_id' => ['A department cannot be placed under itself or its sub-departments.'],
                ]);
            }

            $ancestorId = Department::query()->lockForUpdate()->whereKey($ancestorId)->value('parent_id');
        }
    }
}
