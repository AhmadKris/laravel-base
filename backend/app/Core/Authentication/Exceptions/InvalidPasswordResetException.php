<?php

declare(strict_types=1);

namespace App\Core\Authentication\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class InvalidPasswordResetException extends ApiException
{
    public function __construct()
    {
        parent::__construct('The password reset link is invalid or has expired.', 'AUTH_PASSWORD_RESET_INVALID', 422);
    }
}
