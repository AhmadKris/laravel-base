<?php

declare(strict_types=1);

namespace App\Core\Authorization\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Core\Authorization\Enums\RoleType;
use App\Core\Authorization\Models\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;

final class RoleListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['name', 'users_count', 'created_at'];
    }

    protected function filterRules(): array
    {
        return [
            'type' => ['sometimes', Rule::enum(RoleType::class)],
        ];
    }

    /**
     * @param  Builder<Role>  $query
     * @return Builder<Role>
     */
    public function applyFilters(Builder $query): Builder
    {
        return $this->applySorting($query)
            ->when($this->searchPattern(), fn (Builder $roles, string $pattern) => $roles->where('name', 'like', $pattern))
            ->when($this->validated('type'), fn (Builder $roles, string $type) => RoleType::from($type) === RoleType::BuiltIn
                ? $roles->whereIn('name', Role::PROTECTED_ROLES)
                : $roles->whereNotIn('name', Role::PROTECTED_ROLES))
            ->orderBy('id');
    }
}
