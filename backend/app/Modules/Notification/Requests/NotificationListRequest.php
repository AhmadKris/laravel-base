<?php

declare(strict_types=1);

namespace App\Modules\Notification\Requests;

use App\Core\Api\Pagination\ListRequest;
use App\Modules\Notification\Enums\NotificationCategory;
use App\Modules\Notification\Models\Notification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

final class NotificationListRequest extends ListRequest
{
    protected function sortableFields(): array
    {
        return ['created_at', 'read_at'];
    }

    protected function filterRules(): array
    {
        return [
            'status' => ['sometimes', Rule::in(['unread', 'read'])],
            'category' => ['sometimes', Rule::enum(NotificationCategory::class)],
            ...$this->dateRangeRules(),
        ];
    }

    /**
     * @param  Builder<Notification>  $query
     * @return Builder<Notification>
     */
    public function applyFilters(Builder $query): Builder
    {
        return $this->applyDateRange($this->applySorting($query))
            ->when($this->searchPattern(), fn (Builder $notifications, string $pattern) => $this->search($notifications, $pattern))
            ->when($this->validated('status') === 'unread', fn (Builder $notifications) => $notifications->whereNull('read_at'))
            ->when($this->validated('status') === 'read', fn (Builder $notifications) => $notifications->whereNotNull('read_at'))
            ->when($this->validated('category'), fn (Builder $notifications, string $category) => $notifications->where('type', 'like', "{$category}.%"))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * Matches notification title and message case-insensitively inside the JSON payload.
     *
     * @param  Builder<Notification>  $notifications
     * @return Builder<Notification>
     */
    private function search(Builder $notifications, string $pattern): Builder
    {
        $lowercasePattern = Str::lower($pattern);

        return $notifications->where(fn (Builder $matches) => $matches
            ->whereRaw('LOWER(JSON_UNQUOTE(JSON_EXTRACT(data, "$.title"))) LIKE ?', [$lowercasePattern])
            ->orWhereRaw('LOWER(JSON_UNQUOTE(JSON_EXTRACT(data, "$.message"))) LIKE ?', [$lowercasePattern]));
    }
}
