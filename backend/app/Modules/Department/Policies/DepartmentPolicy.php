<?php

declare(strict_types=1);

namespace App\Modules\Department\Policies;

use App\Modules\Department\Models\Department;
use App\Modules\Department\Services\DepartmentAccessService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Auth\Access\Response;

final class DepartmentPolicy
{
    public function __construct(private readonly DepartmentAccessService $accessService) {}

    public function viewAny(User $user): bool
    {
        return $user->can('department.view');
    }

    public function view(User $user, Department $department): Response
    {
        return $this->withinScope($user, 'department.view', $department);
    }

    public function create(User $user): bool
    {
        return $user->can('department.create');
    }

    public function update(User $user, Department $department): Response
    {
        return $this->withinScope($user, 'department.update', $department);
    }

    public function delete(User $user, Department $department): Response
    {
        return $this->withinScope($user, 'department.delete', $department);
    }

    public function viewUsers(User $user, Department $department): Response
    {
        return $this->withinScope($user, 'user.view', $department);
    }

    private function withinScope(User $user, string $permission, Department $department): Response
    {
        if (! $user->can($permission)) {
            return Response::deny();
        }

        return $this->accessService->canAccessDepartment($user, $department)
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
