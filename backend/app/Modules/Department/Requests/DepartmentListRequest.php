<?php

declare(strict_types=1);

namespace App\Modules\Department\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Modules\Department\Models\Department;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;

final class DepartmentListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['code', 'name', 'created_at'];
    }

    protected function filterRules(): array
    {
        return ['status' => ['sometimes', Rule::enum(ActiveStatus::class)]];
    }

    /**
     * @param  Builder<Department>  $query
     * @return Builder<Department>
     */
    public function applyFilters(Builder $query): Builder
    {
        return $this->applySorting($query)
            ->when($this->validated('search'), fn (Builder $departments, string $search) => $departments
                ->where(fn (Builder $matches) => $matches
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")))
            ->when($this->validated('status'), fn (Builder $departments, string $status) => $departments
                ->where('is_active', ActiveStatus::from($status)->toBoolean()))
            ->orderBy('name')
            ->orderBy('id');
    }
}
