<?php

declare(strict_types=1);

namespace App\Shared\Traits;

use App\Core\Api\Exceptions\ResourceVersionConflictException;
use Illuminate\Support\Facades\DB;

trait HasOptimisticLock
{
    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws ResourceVersionConflictException
     */
    public function updateWithVersion(int $expectedVersion, array $attributes): void
    {
        $this->fill($attributes);

        $updated = $this->newQuery()
            ->whereKey($this->getKey())
            ->where('version', $expectedVersion)
            ->update([...$this->getDirty(), 'version' => DB::raw('version + 1')]);

        if ($updated === 0) {
            throw new ResourceVersionConflictException;
        }

        $this->refresh();
    }
}
