<?php

declare(strict_types=1);

namespace App\Core\Authentication\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class CurrentSessionException extends ApiException
{
    public function __construct()
    {
        parent::__construct('Use logout to end the current session.', 'AUTH_CURRENT_SESSION', 409);
    }
}
