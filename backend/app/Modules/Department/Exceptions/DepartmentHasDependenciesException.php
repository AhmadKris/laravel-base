<?php

declare(strict_types=1);

namespace App\Modules\Department\Exceptions;

use App\Core\Api\Exceptions\ApiException;

final class DepartmentHasDependenciesException extends ApiException
{
    public function __construct()
    {
        parent::__construct(
            'This department still has users or sub-departments.',
            'DEPARTMENT_HAS_DEPENDENCIES',
            409,
        );
    }
}
