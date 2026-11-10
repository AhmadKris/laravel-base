<?php

declare(strict_types=1);

namespace App\Modules\Notification\Actions;

use App\Modules\Notification\Models\Notification;

final class MarkNotificationAsReadAction
{
    public function execute(Notification $notification): Notification
    {
        $notification->markAsRead();

        return $notification->refresh();
    }
}
