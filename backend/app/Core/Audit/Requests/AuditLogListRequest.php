<?php

declare(strict_types=1);

namespace App\Core\Audit\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Core\Audit\Enums\AuditEvent;
use App\Core\Audit\Enums\AuditModule;
use App\Modules\UserManagement\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;
use Spatie\Activitylog\Models\Activity;

final class AuditLogListRequest extends ListRequest
{
    /**
     * A plain date is a whole UTC day. A date-time with an offset lets the client ask for a day in
     * the company time zone, such as 2026-11-10T00:00:00+07:00.
     */
    private const string DATE_FORMATS = 'date_format:Y-m-d,Y-m-d\TH:i:sP';

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
            'date_from' => ['sometimes', self::DATE_FORMATS],
            'date_to' => ['sometimes', self::DATE_FORMATS, 'after_or_equal:date_from'],
        ];
    }

    /**
     * @param  Builder<Activity>  $query
     * @return Builder<Activity>
     */
    public function applyFilters(Builder $query): Builder
    {
        return $this->applySorting($query)
            ->when($this->validated('search'), fn (Builder $logs, string $search) => $this->search($logs, $search))
            ->when($this->validated('user_id'), fn (Builder $logs, string $userId) => $logs
                ->where('causer_type', (new User)->getMorphClass())
                ->whereIn('causer_id', User::withTrashed()->where('uuid', $userId)->select('id')))
            ->when($this->validated('module'), fn (Builder $logs, string $module) => $logs
                ->where('event', 'like', "{$module}.%"))
            ->when($this->validated('action'), fn (Builder $logs, string $action) => $logs
                ->where('event', $action))
            ->when($this->validated('date_from'), fn (Builder $logs, string $date) => $logs
                ->where('created_at', '>=', $this->boundary($date, '00:00:00')))
            ->when($this->validated('date_to'), fn (Builder $logs, string $date) => $logs
                ->where('created_at', '<=', $this->boundary($date, '23:59:59')))
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

    /**
     * Timestamps are stored in UTC, so every boundary is converted to UTC before comparing.
     */
    private function boundary(string $value, string $timeOfDay): string
    {
        $moment = strlen($value) === 10
            ? CarbonImmutable::parse("{$value} {$timeOfDay}", 'UTC')
            : CarbonImmutable::parse($value)->utc();

        return $moment->format('Y-m-d H:i:s');
    }
}
