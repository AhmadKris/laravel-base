<?php

declare(strict_types=1);

namespace App\Shared\Traits;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

trait HasPublicUuid
{
    use HasUuids;

    /**
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
