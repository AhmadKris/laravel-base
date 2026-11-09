<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class UserSelfDeactivationException extends ApiException
{
    public function __construct()
    {
        parent::__construct('You cannot deactivate your own account.', 'USER_SELF_DEACTIVATION', 409);
    }
}
