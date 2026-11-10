<?php

declare(strict_types=1);

namespace App\Modules\Notification\Enums;

/**
 * Only categories that a notification is sent for. A module adds its category when it starts sending one.
 */
enum NotificationCategory: string
{
    case Security = 'security';
    case User = 'user';
}
