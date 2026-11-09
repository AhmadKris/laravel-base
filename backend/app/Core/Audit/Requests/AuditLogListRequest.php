<?php

declare(strict_types=1);

namespace App\Core\Audit\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Core\Audit\Enums\AuditModule;
use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;
use Spatie\Activitylog\Models\Activity;

final class AuditLogListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['created_at'];
    }

    protected function filterRules(): array
    {
        return [
            'user_id' => ['sometimes', 'uuid'],
            'module' => ['sometimes', Rule::enum(AuditModule::class)],
            'action' => ['sometimes', 'string', 'max:100'],
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:date_from'],
        ];
    }

    /**
     * @param  Builder<Activity>  $query
     * @return Builder<Activity>
     */
    public function applyFilters(Builder $query): Builder
    {
        return $this->applySorting($query)
            ->when($this->validated('search'), fn (Builder $logs, string $search) => $logs
                ->where('event', 'like', "%{$search}%"))
            ->when($this->validated('user_id'), fn (Builder $logs, string $userId) => $logs
                ->where('causer_type', (new User)->getMorphClass())
                ->whereIn('causer_id', User::withTrashed()->where('uuid', $userId)->select('id')))
            ->when($this->validated('module'), fn (Builder $logs, string $module) => $logs
                ->where('event', 'like', "{$module}.%"))
            ->when($this->validated('action'), fn (Builder $logs, string $action) => $logs
                ->where('event', $action))
            ->when($this->validated('date_from'), fn (Builder $logs, string $date) => $logs
                ->where('created_at', '>=', "{$date} 00:00:00"))
            ->when($this->validated('date_to'), fn (Builder $logs, string $date) => $logs
                ->where('created_at', '<=', "{$date} 23:59:59"))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }
}
