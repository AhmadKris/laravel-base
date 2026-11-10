<?php

declare(strict_types=1);

namespace App\Modules\Notification\Policies;

use App\Modules\Notification\Models\Notification;
use App\Modules\UserManagement\Models\User;
use Illuminate\Auth\Access\Response;

final class NotificationPolicy
{
    public function viewAny(User $actor): bool
    {
        return true;
    }

    public function markAllAsRead(User $actor): bool
    {
        return true;
    }

    public function markAsRead(User $actor, Notification $notification): Response
    {
        return $this->owns($actor, $notification)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    private function owns(User $actor, Notification $notification): bool
    {
        return $notification->notifiable_type === $actor->getMorphClass()
            && (string) $notification->notifiable_id === (string) $actor->getKey();
    }
}
