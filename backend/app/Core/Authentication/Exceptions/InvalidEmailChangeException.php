<?php

declare(strict_types=1);

namespace App\Core\Authentication\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class InvalidEmailChangeException extends ApiException
{
    public function __construct()
    {
        parent::__construct('The email confirmation link is invalid or has expired.', 'AUTH_EMAIL_CHANGE_INVALID', 422);
    }
}
