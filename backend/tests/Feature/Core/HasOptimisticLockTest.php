<?php

declare(strict_types=1);

use App\Core\Api\Exceptions\ResourceVersionConflictException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\Fixtures\Models\SampleRecord;

beforeEach(fn () => SampleRecord::createTable());

afterEach(fn () => SampleRecord::dropTable());

it('updates the record and increments its version', function () {
    $record = SampleRecord::create(['name' => 'Finance']);

    $record->updateWithVersion(1, ['name' => 'Accounting']);

    expect($record->name)->toBe('Accounting')
        ->and($record->version)->toBe(2);
});

it('rejects a stale version without changing data', function () {
    $record = SampleRecord::create(['name' => 'Finance']);
    SampleRecord::whereKey($record->getKey())->update(['version' => 2, 'name' => 'Updated elsewhere']);

    expect(fn () => $record->updateWithVersion(1, ['name' => 'Accounting']))
        ->toThrow(ResourceVersionConflictException::class);

    $stored = SampleRecord::findOrFail($record->getKey());

    expect($stored->name)->toBe('Updated elsewhere')
        ->and($stored->version)->toBe(2);
});

it('lets only one of two concurrent editors win', function () {
    $record = SampleRecord::create(['name' => 'Finance']);
    $firstEditor = SampleRecord::findOrFail($record->getKey());
    $secondEditor = SampleRecord::findOrFail($record->getKey());

    $firstEditor->updateWithVersion(1, ['name' => 'First']);

    expect(fn () => $secondEditor->updateWithVersion(1, ['name' => 'Second']))
        ->toThrow(ResourceVersionConflictException::class)
        ->and(SampleRecord::findOrFail($record->getKey())->name)->toBe('First');
});

it('responds with a version conflict error', function () {
    $record = SampleRecord::create(['name' => 'Finance']);

    Route::patch('/api/v1/sample-records', function (Request $request) use ($record) {
        $record->updateWithVersion($request->integer('version'), ['name' => 'Accounting']);

        return ['ok' => true];
    });

    $this->patchJson('/api/v1/sample-records', ['version' => 9])
        ->assertStatus(409)
        ->assertJsonPath('code', 'RESOURCE_VERSION_CONFLICT');
});
