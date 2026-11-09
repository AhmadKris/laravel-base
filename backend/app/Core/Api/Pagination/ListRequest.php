<?php

declare(strict_types=1);

namespace App\Core\Api\Pagination;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class ListRequest extends FormRequest
{
    private const int DEFAULT_PER_PAGE = 20;

    private const int MAX_PER_PAGE = 100;

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
}
