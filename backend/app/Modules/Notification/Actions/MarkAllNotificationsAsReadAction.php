<?php

declare(strict_types=1);

namespace App\Modules\Notification\Actions;

use App\Modules\Notification\Models\Notification;
use App\Modules\UserManagement\Models\User;

final class MarkAllNotificationsAsReadAction
{
    public function execute(User $user): int
    {
        return Notification::query()
            ->visibleTo($user)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
