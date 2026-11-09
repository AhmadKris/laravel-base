<?php

declare(strict_types=1);

namespace App\Core\Authorization\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class PrivilegeEscalationException extends ApiException
{
    public function __construct()
    {
        parent::__construct('You cannot grant access beyond your own authority.', 'AUTH_PRIVILEGE_ESCALATION', 403);
    }
}
