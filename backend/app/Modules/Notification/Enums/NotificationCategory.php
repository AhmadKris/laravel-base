<?php

declare(strict_types=1);

namespace App\Modules\Notification\Enums;

enum NotificationCategory: string
{
    case Security = 'security';
    case User = 'user';
    case System = 'system';
    case Workflow = 'workflow';
    case Document = 'document';
}
