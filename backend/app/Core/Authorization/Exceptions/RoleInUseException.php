<?php

declare(strict_types=1);

namespace App\Core\Authorization\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class RoleInUseException extends ApiException
{
    public function __construct()
    {
        parent::__construct('This role is still assigned to users.', 'ROLE_IN_USE', 409);
    }
}
