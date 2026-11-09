<?php

declare(strict_types=1);

namespace App\Core\Authorization\Policies;

use App\Modules\UserManagement\Models\User;

final class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('role.view');
    }

    public function view(User $user): bool
    {
        return $user->can('role.view');
    }

    public function create(User $user): bool
    {
        return $user->can('role.create');
    }

    public function update(User $user): bool
    {
        return $user->can('role.update');
    }

    public function delete(User $user): bool
    {
        return $user->can('role.delete');
    }

    public function assignPermissions(User $user): bool
    {
        return $user->can('permission.assign');
    }
}
