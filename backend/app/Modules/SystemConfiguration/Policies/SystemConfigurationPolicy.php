<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Policies;

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Illuminate\Auth\Access\Response;

final class SystemConfigurationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('system_config.view');
    }

    public function view(User $user, SystemConfiguration $configuration): Response
    {
        return $this->withinAccess($user, 'system_config.view', $configuration);
    }

    public function update(User $user, SystemConfiguration $configuration): Response
    {
        return $this->withinAccess($user, 'system_config.update', $configuration);
    }

    private function withinAccess(User $user, string $permission, SystemConfiguration $configuration): Response
    {
        if (! $user->can($permission)) {
            return Response::deny();
        }

        return $configuration->isVisibleTo($user) ? Response::allow() : Response::denyAsNotFound();
    }
}
