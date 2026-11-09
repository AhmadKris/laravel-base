<?php

declare(strict_types=1);

namespace App\Modules\Department\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateDepartmentAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, User $actor): Department
    {
        return DB::transaction(function () use ($attributes, $actor): Department {
            $department = Department::query()->create($attributes);

            $this->auditLogger->record('department.created', $department, ['code' => $department->code], $actor);

            return $department;
        });
    }
}
