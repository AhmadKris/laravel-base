<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function rolePermissions(string $role): array
{
    return Role::findByName($role, 'web')->permissions->pluck('name')->sort()->values()->all();
}

it('seeds the base permissions under the web guard', function () {
    $this->seed(RolePermissionSeeder::class);

    expect(Permission::query()->count())->toBe(19)
        ->and(Permission::query()->where('guard_name', '!=', 'web')->exists())->toBeFalse();
});

it('seeds only the base roles', function () {
    $this->seed(RolePermissionSeeder::class);

    expect(Role::query()->pluck('name')->sort()->values()->all())
        ->toBe(['Admin', 'Staff', 'Super Admin', 'Viewer']);
});

it('matches the authorization matrix', function (string $role, array $expected) {
    $this->seed(RolePermissionSeeder::class);

    expect(rolePermissions($role))->toBe(collect($expected)->sort()->values()->all());
})->with([
    'Admin' => ['Admin', [
        'audit.view',
        'department.create',
        'department.delete',
        'department.update',
        'department.view',
        'permission.view',
        'role.view',
        'system_config.update',
        'system_config.view',
        'user.assign_role',
        'user.create',
        'user.delete',
        'user.update',
        'user.view',
    ]],
    'Staff' => ['Staff', ['department.view', 'user.view']],
    'Viewer' => ['Viewer', ['department.view', 'user.view']],
]);

it('gives the super admin every permission', function () {
    $this->seed(RolePermissionSeeder::class);

    expect(rolePermissions('Super Admin'))->toHaveCount(19);
});

it('applies seeded permissions to a user through the web guard', function () {
    $this->seed(RolePermissionSeeder::class);
    $user = User::factory()->create();

    $user->assignRole('Staff');

    expect($user->can('user.view'))->toBeTrue()
        ->and($user->can('user.create'))->toBeFalse();
});

it('keeps role changes made in the application when seeded again', function () {
    $this->seed(RolePermissionSeeder::class);
    Role::findByName('Staff', 'web')->givePermissionTo('audit.view');

    $this->seed(RolePermissionSeeder::class);

    expect(rolePermissions('Staff'))->toContain('audit.view');
});

it('can be seeded repeatedly without duplicates', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(Permission::query()->count())->toBe(19)
        ->and(Role::query()->count())->toBe(4)
        ->and(Department::query()->count())->toBe(3)
        ->and(SystemConfiguration::query()->count())->toBe(7);
});

it('generates uuids for seeded departments', function () {
    $this->seed(DatabaseSeeder::class);

    Department::query()->each(fn (Department $department) => expect(Str::isUuid($department->uuid))->toBeTrue());
});

it('does not restore or overwrite existing department data', function () {
    $this->seed(DatabaseSeeder::class);
    $department = Department::query()->where('code', 'IT')->sole();
    $department->update(['name' => 'Teknologi Informasi']);
    $department->delete();

    $this->seed(DatabaseSeeder::class);

    expect(Department::withTrashed()->where('code', 'IT')->sole()->name)->toBe('Teknologi Informasi')
        ->and(Department::query()->where('code', 'IT')->exists())->toBeFalse();
});

it('keeps configuration values changed in the application', function () {
    $this->seed(DatabaseSeeder::class);
    SystemConfiguration::query()->where('key', 'company.name')->sole()->update(['value' => 'PT Maju']);

    $this->seed(DatabaseSeeder::class);

    expect(SystemConfiguration::query()->where('key', 'company.name')->sole()->value)->toBe('PT Maju');
});

it('seeds the company profile without exposing private fields', function () {
    $this->seed(DatabaseSeeder::class);

    expect(SystemConfiguration::query()->where('key', 'company.name')->sole()->is_public)->toBeTrue()
        ->and(SystemConfiguration::query()->where('key', 'company.email')->sole()->is_public)->toBeFalse();
});
