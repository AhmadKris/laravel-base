<?php

declare(strict_types=1);

namespace Tests\Fixtures\Http;

use App\Core\Api\Pagination\ListRequest;

final class SampleListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['name', 'created_at'];
    }

    protected function filterRules(): array
    {
        return ['status' => ['sometimes', 'string', 'in:active,inactive']];
    }
}
