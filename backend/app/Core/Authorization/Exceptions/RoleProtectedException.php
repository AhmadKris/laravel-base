<?php

declare(strict_types=1);

namespace App\Core\Authorization\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class RoleProtectedException extends ApiException
{
    public function __construct()
    {
        parent::__construct('This built-in role cannot be changed.', 'ROLE_PROTECTED', 409);
    }
}
