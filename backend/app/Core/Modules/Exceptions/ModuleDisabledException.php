<?php

declare(strict_types=1);

namespace App\Core\Modules\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class ModuleDisabledException extends ApiException
{
    public function __construct()
    {
        parent::__construct('This module is disabled.', 'MODULE_DISABLED', 404);
    }
}
