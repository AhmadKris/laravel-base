<?php

declare(strict_types=1);

use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;

// Dropping tables commits implicitly in MySQL, so a wrapping test transaction cannot be used.
uses(DatabaseMigrations::class);

function removeDepartmentsMigration(): object
{
    return require database_path('migrations/2026_11_10_000000_remove_departments.php');
}

it('removes the table, the user column, and the permissions', function () {
    $this->seed(RolePermissionSeeder::class);
    $migration = removeDepartmentsMigration();
    $migration->down();
    Permission::findOrCreate('department.view', 'web');

    $migration->up();

    expect(Schema::hasTable('departments'))->toBeFalse()
        ->and(Schema::hasColumn('users', 'department_id'))->toBeFalse()
        ->and(DB::table('permissions')->where('name', 'like', 'department.%')->count())->toBe(0)
        ->and(DB::table('permissions')->where('name', 'user.view')->count())->toBe(1);
});

it('keeps audit history while clearing subjects whose model no longer exists', function () {
    $migration = removeDepartmentsMigration();
    $migration->down();
    $departmentLog = DB::table('activity_log')->insertGetId([
        'log_name' => 'audit',
        'description' => 'department.created',
        'event' => 'department.created',
        'subject_type' => 'App\\Modules\\Department\\Models\\Department',
        'subject_id' => 7,
    ]);
    $userLog = DB::table('activity_log')->insertGetId([
        'log_name' => 'audit',
        'description' => 'user.created',
        'event' => 'user.created',
        'subject_type' => 'App\\Modules\\UserManagement\\Models\\User',
        'subject_id' => 7,
    ]);

    $migration->up();

    expect(DB::table('activity_log')->where('id', $departmentLog)->first())
        ->event->toBe('department.created')
        ->subject_type->toBeNull()
        ->subject_id->toBeNull();
    expect(DB::table('activity_log')->where('id', $userLog)->value('subject_id'))->toBe(7);
});
