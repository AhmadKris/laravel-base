<?php

declare(strict_types=1);

namespace App\Modules\Department\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\Department\Exceptions\DepartmentHasDependenciesException;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class DeleteDepartmentAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws DepartmentHasDependenciesException
     */
    public function execute(Department $department, User $actor): void
    {
        if ($department->users()->exists() || $department->children()->exists()) {
            throw new DepartmentHasDependenciesException;
        }

        DB::transaction(function () use ($department, $actor): void {
            $this->auditLogger->record('department.deleted', $department, ['code' => $department->code], $actor);

            $department->delete();
        });
    }
}
