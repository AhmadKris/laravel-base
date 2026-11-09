<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Illuminate\Database\Eloquent\Builder;

final class ConfigurationListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['key', 'updated_at'];
    }

    /**
     * @param  Builder<SystemConfiguration>  $query
     * @return Builder<SystemConfiguration>
     */
    public function applyFilters(Builder $query): Builder
    {
        return $this->applySorting($query)
            ->when($this->validated('search'), fn (Builder $configurations, string $search) => $configurations
                ->where('key', 'like', "%{$search}%"))
            ->orderBy('key');
    }
}
