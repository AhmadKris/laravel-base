<?php

declare(strict_types=1);

namespace App\Core\Api\Exceptions;

final class ResourceVersionConflictException extends ApiException
{
    public function __construct()
    {
        parent::__construct(
            'The resource was changed by another user. Reload it and try again.',
            'RESOURCE_VERSION_CONFLICT',
            409,
        );
    }
}
