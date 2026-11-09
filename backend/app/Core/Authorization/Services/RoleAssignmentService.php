<?php

declare(strict_types=1);

namespace App\Core\Authorization\Services;

use App\Modules\UserManagement\Models\User;

final class RoleAssignmentService
{
    public function canManage(User $actor, User $target): bool
    {
        return $target->getRoleNames()->every(fn (string $role): bool => $this->canAssign($actor, $role));
    }

    public function canAssign(User $actor, string $role): bool
    {
        /** @var array<string, list<string>> $policy */
        $policy = config('authorization.assignable_roles');

        foreach ($actor->getRoleNames() as $actorRole) {
            $assignable = $policy[$actorRole] ?? [];

            if (in_array('*', $assignable, true) || in_array($role, $assignable, true)) {
                return true;
            }
        }

        return false;
    }
}
