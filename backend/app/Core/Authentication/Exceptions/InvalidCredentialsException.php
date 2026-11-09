<?php

declare(strict_types=1);

namespace App\Core\Authentication\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class InvalidCredentialsException extends ApiException
{
    public function __construct()
    {
        parent::__construct('The provided credentials are incorrect.', 'AUTH_INVALID_CREDENTIALS', 401);
    }
}
