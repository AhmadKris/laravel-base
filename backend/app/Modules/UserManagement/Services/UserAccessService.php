<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Services;

use App\Modules\UserManagement\Models\User;

final class UserAccessService
{
    private const array GLOBAL_ACCESS_ROLES = ['Super Admin', 'System Admin', 'Admin'];

    public function hasGlobalAccess(User $user): bool
    {
        return $user->hasAnyRole(self::GLOBAL_ACCESS_ROLES);
    }

    public function canAccessUser(User $viewer, User $target): bool
    {
        return $this->hasGlobalAccess($viewer) || $viewer->is($target);
    }
}
