<?php

declare(strict_types=1);

namespace App\Core\Audit\Enums;

enum AuditModule: string
{
    case Auth = 'auth';
    case User = 'user';
    case Role = 'role';
    case Permission = 'permission';
    case System = 'system';
}
