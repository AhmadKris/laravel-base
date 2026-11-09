<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Tests\Fixtures\Http\SampleListRequest;
use Tests\Fixtures\Models\SampleRecord;

beforeEach(function () {
    Route::get('/api/v1/samples', fn (SampleListRequest $request) => [
        'per_page' => $request->perPage(),
        'sql' => $request->applySorting(SampleRecord::query())->toSql(),
    ]);
});

it('uses the default page size', function () {
    $this->getJson('/api/v1/samples')->assertOk()->assertJsonPath('per_page', 20);
});

it('accepts the maximum page size', function () {
    $this->getJson('/api/v1/samples?per_page=100')->assertOk()->assertJsonPath('per_page', 100);
});

it('rejects invalid list parameters', function (string $query, string $field) {
    $this->getJson('/api/v1/samples?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'page size above the limit' => ['per_page=101', 'per_page'],
    'page size below one' => ['per_page=0', 'per_page'],
    'page below one' => ['page=0', 'page'],
    'column outside the allowlist' => ['sort_by=password', 'sort_by'],
    'sql in the sort field' => ['sort_by=name;drop%20table%20users', 'sort_by'],
    'unknown sort direction' => ['sort_by=name&sort_direction=sideways', 'sort_direction'],
    'invalid module filter' => ['status=deleted', 'status'],
]);

it('sorts by an allowed field', function () {
    $this->getJson('/api/v1/samples?sort_by=created_at&sort_direction=desc')
        ->assertOk()
        ->assertJsonPath('sql', 'select * from `sample_records` order by `created_at` desc');
});

it('defaults to ascending when no direction is given', function () {
    $this->getJson('/api/v1/samples?sort_by=name')
        ->assertOk()
        ->assertJsonPath('sql', 'select * from `sample_records` order by `name` asc');
});

it('does not sort when no field is given', function () {
    $this->getJson('/api/v1/samples')
        ->assertOk()
        ->assertJsonPath('sql', 'select * from `sample_records`');
});
