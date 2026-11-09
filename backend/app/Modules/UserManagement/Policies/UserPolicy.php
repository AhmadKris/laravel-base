<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Policies;

use App\Core\Authorization\Services\RoleAssignmentService;
use App\Modules\Department\Services\DepartmentAccessService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Auth\Access\Response;

final class UserPolicy
{
    public function __construct(
        private readonly DepartmentAccessService $accessService,
        private readonly RoleAssignmentService $roleAssignment,
    ) {}

    public function viewAny(User $actor): bool
    {
        return $actor->can('user.view');
    }

    public function view(User $actor, User $target): Response
    {
        if (! $actor->can('user.view')) {
            return Response::deny();
        }

        return $this->accessService->canAccessUser($actor, $target) ? Response::allow() : Response::denyAsNotFound();
    }

    public function create(User $actor): bool
    {
        return $actor->can('user.create');
    }

    public function update(User $actor, User $target): Response
    {
        return $this->manage($actor, 'user.update', $target);
    }

    public function delete(User $actor, User $target): Response
    {
        return $this->manage($actor, 'user.delete', $target);
    }

    public function assignRoles(User $actor, User $target): Response
    {
        return $this->manage($actor, 'user.assign_role', $target);
    }

    /**
     * Editing a user with a higher role would allow taking over that account through its email and password reset.
     */
    private function manage(User $actor, string $permission, User $target): Response
    {
        if (! $actor->can($permission)) {
            return Response::deny();
        }

        if (! $this->accessService->canAccessUser($actor, $target)) {
            return Response::denyAsNotFound();
        }

        return $actor->is($target) || $this->roleAssignment->canManage($actor, $target)
            ? Response::allow()
            : Response::deny();
    }
}
