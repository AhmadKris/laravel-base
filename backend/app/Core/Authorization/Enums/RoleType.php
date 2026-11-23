<?php

declare(strict_types=1);

namespace App\Core\Authorization\Enums;

enum RoleType: string
{
    case BuiltIn = 'built_in';
    case Custom = 'custom';
}
