<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class LastSuperAdminException extends ApiException
{
    public function __construct()
    {
        parent::__construct('The last active Super Admin cannot be deactivated.', 'USER_LAST_SUPER_ADMIN', 409);
    }
}
