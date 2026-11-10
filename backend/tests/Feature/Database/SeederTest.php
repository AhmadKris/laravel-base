<?php

declare(strict_types=1);

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function rolePermissions(string $role): array
{
    return Role::findByName($role, 'web')->permissions->pluck('name')->sort()->values()->all();
}

it('seeds the base permissions under the web guard', function () {
    $this->seed(RolePermissionSeeder::class);

    expect(Permission::query()->count())->toBe(15)
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
    'Staff' => ['Staff', ['user.view']],
    'Viewer' => ['Viewer', ['user.view']],
]);

it('gives the super admin every permission', function () {
    $this->seed(RolePermissionSeeder::class);

    expect(rolePermissions('Super Admin'))->toHaveCount(15);
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

    expect(Permission::query()->count())->toBe(15)
        ->and(Role::query()->count())->toBe(4)
        ->and(SystemConfiguration::query()->count())->toBe(13);
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
