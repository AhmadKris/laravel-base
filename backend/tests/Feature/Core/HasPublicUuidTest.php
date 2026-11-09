<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\Fixtures\Models\SampleRecord;

beforeEach(function () {
    SampleRecord::createTable();

    Route::middleware('api')->get(
        '/api/v1/sample-records/{record}',
        fn (SampleRecord $record) => ['name' => $record->name],
    );
});

afterEach(fn () => SampleRecord::dropTable());

it('generates a uuid while keeping the integer primary key', function () {
    $record = SampleRecord::create(['name' => 'Finance']);

    expect(Str::isUuid($record->uuid))->toBeTrue()
        ->and($record->getKey())->toBeInt();
});

it('resolves a model by uuid', function () {
    $record = SampleRecord::create(['name' => 'Finance']);

    $this->getJson("/api/v1/sample-records/{$record->uuid}")
        ->assertOk()
        ->assertExactJson(['name' => 'Finance']);
});

it('does not resolve a model by its internal id', function () {
    $record = SampleRecord::create(['name' => 'Finance']);

    $this->getJson("/api/v1/sample-records/{$record->getKey()}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});
