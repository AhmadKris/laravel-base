<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function columnTypes(string $table): array
{
    return collect(Schema::getColumns($table))->pluck('type', 'name')->all();
}

it('defines the columns specified for each table', function (string $table, array $expected) {
    expect(columnTypes($table))->toMatchArray($expected);
})->with([
    'users' => ['users', [
        'uuid' => 'char(36)',
        'department_id' => 'bigint unsigned',
        'name' => 'varchar(150)',
        'email' => 'varchar(255)',
        'is_active' => 'tinyint(1)',
        'last_login_at' => 'timestamp',
        'deleted_at' => 'timestamp',
    ]],
    'departments' => ['departments', [
        'uuid' => 'char(36)',
        'parent_id' => 'bigint unsigned',
        'code' => 'varchar(50)',
        'name' => 'varchar(150)',
        'description' => 'text',
        'is_active' => 'tinyint(1)',
        'deleted_at' => 'timestamp',
    ]],
    'system_configurations' => ['system_configurations', [
        'key' => 'varchar(150)',
        'value' => 'json',
        'is_public' => 'tinyint(1)',
        'is_sensitive' => 'tinyint(1)',
        'updated_by' => 'bigint unsigned',
        'version' => 'int unsigned',
    ]],
    'roles' => ['roles', ['version' => 'int unsigned']],
]);

it('generates a uuid and activates new users by default', function () {
    $user = User::factory()->create()->refresh();

    expect(Str::isUuid($user->uuid))->toBeTrue()
        ->and($user->is_active)->toBeTrue()
        ->and($user->getRouteKeyName())->toBe('uuid');
});

it('hides secrets when a user is serialized', function () {
    expect(User::factory()->create()->toArray())
        ->not->toHaveKey('password')
        ->not->toHaveKey('remember_token');
});

it('reserves the email of a soft deleted user', function () {
    $user = User::factory()->create();
    $user->delete();

    expect(fn () => User::factory()->create(['email' => $user->email]))->toThrow(QueryException::class);
});

it('requires an existing department for a user', function () {
    expect(fn () => User::factory()->create(['department_id' => 999999]))->toThrow(QueryException::class);
});

it('prevents deleting a department that still has users', function () {
    $department = Department::factory()->create();
    User::factory()->create(['department_id' => $department->id]);

    expect(fn () => $department->forceDelete())->toThrow(QueryException::class);
});

it('prevents deleting a department that still has children', function () {
    $parent = Department::factory()->create();
    DB::table('departments')->insert([
        'uuid' => (string) Str::uuid(),
        'parent_id' => $parent->id,
        'code' => 'CHILD',
        'name' => 'Child department',
    ]);

    expect(fn () => $parent->forceDelete())->toThrow(QueryException::class);
});

it('rejects a duplicate department code even when the original is soft deleted', function () {
    $department = Department::factory()->create(['code' => 'IT']);
    $department->delete();

    expect(fn () => Department::factory()->create(['code' => 'IT']))->toThrow(QueryException::class);
});

it('rejects a duplicate configuration key', function () {
    SystemConfiguration::factory()->create(['key' => 'company.name']);

    expect(fn () => SystemConfiguration::factory()->create(['key' => 'company.name']))
        ->toThrow(QueryException::class);
});

it('stores json values and starts versioning at one', function () {
    $configuration = SystemConfiguration::factory()->create(['value' => ['enabled' => true]])->refresh();

    expect($configuration->value)->toBe(['enabled' => true])
        ->and($configuration->version)->toBe(1);
});
