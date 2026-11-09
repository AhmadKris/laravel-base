<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Modules\UserManagement\Models\User;
use App\Shared\Enums\ActiveStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;

final class UserListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['name', 'email', 'created_at'];
    }

    protected function filterRules(): array
    {
        return ['status' => ['sometimes', Rule::enum(ActiveStatus::class)]];
    }

    /**
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    public function applyFilters(Builder $query): Builder
    {
        return $this->applySorting($query)
            ->when($this->validated('search'), fn (Builder $users, string $search) => $users
                ->where(fn (Builder $matches) => $matches
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")))
            ->when($this->validated('status'), fn (Builder $users, string $status) => $users
                ->where('is_active', ActiveStatus::from($status)->toBoolean()))
            ->orderBy('name')
            ->orderBy('id');
    }
}
