<?php

declare(strict_types=1);

namespace App\Modules\Department\Services;

use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;

final class DepartmentAccessService
{
    private const array GLOBAL_ACCESS_ROLES = ['Super Admin', 'System Admin', 'Admin'];

    public function hasGlobalAccess(User $user): bool
    {
        return $user->hasAnyRole(self::GLOBAL_ACCESS_ROLES);
    }

    public function canAccessDepartment(User $user, Department $department): bool
    {
        return $this->hasGlobalAccess($user) || $user->department_id === $department->id;
    }
}
