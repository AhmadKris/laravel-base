<?php

declare(strict_types=1);

namespace App\Core\Audit\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Core\Audit\Enums\AuditEvent;
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
            ...$this->dateRangeRules(),
        ];
    }

    /**
     * @param  Builder<Activity>  $query
     * @return Builder<Activity>
     */
    public function applyFilters(Builder $query): Builder
    {
        $filtered = $this->applyDateRange($this->applySorting($query));

        return $filtered
            ->when($this->validated('search'), fn (Builder $logs, string $search) => $this->search($logs, $search))
            ->when($this->validated('user_id'), fn (Builder $logs, string $userId) => $logs
                ->where('causer_type', (new User)->getMorphClass())
                ->whereIn('causer_id', User::withTrashed()->where('uuid', $userId)->select('id')))
            ->when($this->validated('module'), fn (Builder $logs, string $module) => $logs
                ->where('event', 'like', "{$module}.%"))
            ->when($this->validated('action'), fn (Builder $logs, string $action) => $logs
                ->where('event', $action))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * Matches what the list shows: the event code, the action in Indonesian, and the actor.
     *
     * @param  Builder<Activity>  $logs
     * @return Builder<Activity>
     */
    private function search(Builder $logs, string $search): Builder
    {
        $pattern = $this->searchPattern();

        return $logs->where(fn (Builder $matches) => $matches
            ->where('event', 'like', $pattern)
            ->orWhereIn('event', AuditEvent::matchingAction($search))
            ->orWhere(fn (Builder $byActor) => $byActor
                ->where('causer_type', (new User)->getMorphClass())
                ->whereIn('causer_id', User::withTrashed()
                    ->where(fn (Builder $users) => $users
                        ->where('name', 'like', $pattern)
                        ->orWhere('email', 'like', $pattern))
                    ->select('id'))));
    }
}
