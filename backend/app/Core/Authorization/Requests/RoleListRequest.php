<?php

declare(strict_types=1);

namespace App\Core\Authorization\Requests;

use App\Core\Api\Pagination\ListRequest;

final class RoleListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['name', 'created_at'];
    }
}
