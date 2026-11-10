<?php

declare(strict_types=1);

namespace App\Core\Api\Pagination;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class ListRequest extends FormRequest
{
    private const int DEFAULT_PER_PAGE = 20;

    private const int MAX_PER_PAGE = 100;

    /**
     * A plain date is a whole UTC day. A date-time with an offset lets the client ask for a day in
     * the company time zone, such as 2026-11-10T00:00:00+07:00.
     */
    private const string DATE_FORMATS = 'date_format:Y-m-d,Y-m-d\TH:i:sP';

    /**
     * @return list<string>
     */
    abstract protected function sortableFields(): array;

    /**
     * @return array<string, mixed>
     */
    protected function filterRules(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    final public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'sort_by' => ['sometimes', 'string', Rule::in($this->sortableFields())],
            'sort_direction' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            ...$this->filterRules(),
        ];
    }

    public function perPage(): int
    {
        return (int) $this->validated('per_page', self::DEFAULT_PER_PAGE);
    }

    /**
     * The search as a LIKE pattern that matches it anywhere, or null without a search. % and _
     * are escaped, so a user searching for "100%" does not get every row.
     */
    public function searchPattern(): ?string
    {
        $search = $this->validated('search');

        return is_string($search) && $search !== '' ? '%'.addcslashes($search, '%_\\').'%' : null;
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public function applySorting(Builder $query): Builder
    {
        $field = $this->validated('sort_by');

        if (! is_string($field)) {
            return $query;
        }

        return $query->orderBy($field, $this->validated('sort_direction') === 'desc' ? 'desc' : 'asc');
    }

    /**
     * @return array<string, mixed>
     */
    protected function dateRangeRules(): array
    {
        return [
            'date_from' => ['sometimes', self::DATE_FORMATS],
            'date_to' => ['sometimes', self::DATE_FORMATS, 'after_or_equal:date_from'],
        ];
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    protected function applyDateRange(Builder $query, string $column = 'created_at'): Builder
    {
        return $query
            ->when($this->validated('date_from'), fn (Builder $records, string $date) => $records
                ->where($column, '>=', $this->utcBoundary($date, '00:00:00')))
            ->when($this->validated('date_to'), fn (Builder $records, string $date) => $records
                ->where($column, '<=', $this->utcBoundary($date, '23:59:59')));
    }

    /**
     * Timestamps are stored in UTC, so every boundary is converted to UTC before comparing.
     */
    private function utcBoundary(string $value, string $timeOfDay): string
    {
        $moment = strlen($value) === 10
            ? CarbonImmutable::parse("{$value} {$timeOfDay}", 'UTC')
            : CarbonImmutable::parse($value)->utc();

        return $moment->format('Y-m-d H:i:s');
    }
}
