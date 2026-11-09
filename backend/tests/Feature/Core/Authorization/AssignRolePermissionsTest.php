<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->superAdmin = userWithRole('Super Admin');
    $this->auditor = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    $this->auditor->givePermissionTo('user.view');
});

function assignPermissions(mixed $test, User $actor, Role $role, array $permissions, int $version = 1): mixed
{
    return $test->actingAs($actor)->putJson("/api/v1/roles/{$role->id}/permissions", [
        'permissions' => $permissions,
        'version' => $version,
    ]);
}

function permissionNames(Role $role): array
{
    return $role->refresh()->permissions()->orderBy('name')->pluck('name')->all();
}

it('replaces the permissions and increments the version', function () {
    assignPermissions($this, $this->superAdmin, $this->auditor, ['audit.view', 'role.view'])
        ->assertOk()
        ->assertJsonPath('data.version', 2);

    expect(permissionNames($this->auditor))->toBe(['audit.view', 'role.view']);
});

it('rejects a stale version without changing permissions', function () {
    assignPermissions($this, $this->superAdmin, $this->auditor, ['audit.view'], 9)
        ->assertConflict()
        ->assertJsonPath('code', 'RESOURCE_VERSION_CONFLICT');

    expect(permissionNames($this->auditor))->toBe(['user.view'])
        ->and($this->auditor->version)->toBe(1);
});

it('lets only one of two concurrent saves win', function () {
    assignPermissions($this, $this->superAdmin, $this->auditor, ['audit.view'])->assertOk();

    assignPermissions($this, $this->superAdmin, $this->auditor, ['role.view'])
        ->assertConflict()
        ->assertJsonPath('code', 'RESOURCE_VERSION_CONFLICT');

    expect(permissionNames($this->auditor))->toBe(['audit.view']);
});

it('validates the payload', function (array $payload, string $field) {
    $this->actingAs($this->superAdmin)
        ->putJson("/api/v1/roles/{$this->auditor->id}/permissions", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    expect(permissionNames($this->auditor))->toBe(['user.view']);
})->with([
    'unregistered permission' => [['permissions' => ['does.not.exist'], 'version' => 1], 'permissions.0'],
    'duplicate permission' => [['permissions' => ['user.view', 'user.view'], 'version' => 1], 'permissions.0'],
    'missing permissions' => [['version' => 1], 'permissions'],
    'missing version' => [['permissions' => ['user.view']], 'version'],
    'invalid version' => [['permissions' => ['user.view'], 'version' => 0], 'version'],
]);

it('allows removing every permission', function () {
    assignPermissions($this, $this->superAdmin, $this->auditor, [])->assertOk();

    expect(permissionNames($this->auditor))->toBe([]);
});

it('never changes the super admin role', function () {
    assignPermissions($this, $this->superAdmin, Role::query()->where('name', 'Super Admin')->sole(), [])
        ->assertConflict()
        ->assertJsonPath('code', 'ROLE_PROTECTED');

    expect($this->superAdmin->refresh()->can('role.view'))->toBeTrue();
});

it('blocks granting a permission the actor does not hold', function () {
    $delegate = Role::create(['name' => 'Delegate', 'guard_name' => 'web']);
    $delegate->givePermissionTo(['permission.assign', 'user.view']);
    $actor = User::factory()->create();
    $actor->assignRole($delegate);

    assignPermissions($this, $actor, $this->auditor, ['user.view', 'audit.view'])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');

    expect(permissionNames($this->auditor))->toBe(['user.view'])
        ->and($this->auditor->version)->toBe(1);
});

it('blocks actors from raising the permissions of their own role', function () {
    $delegate = Role::create(['name' => 'Delegate', 'guard_name' => 'web']);
    $delegate->givePermissionTo('permission.assign');
    $actor = User::factory()->create();
    $actor->assignRole($delegate);

    assignPermissions($this, $actor, $delegate, ['permission.assign', 'role.delete'])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');
});

it('lets an actor keep or remove permissions they do not hold', function () {
    $delegate = Role::create(['name' => 'Delegate', 'guard_name' => 'web']);
    $delegate->givePermissionTo('permission.assign');
    $actor = User::factory()->create();
    $actor->assignRole($delegate);
    $this->auditor->givePermissionTo('audit.view');

    assignPermissions($this, $actor, $this->auditor, ['user.view'])->assertOk();

    expect(permissionNames($this->auditor))->toBe(['user.view']);
});

it('applies the change to existing users immediately', function () {
    $user = User::factory()->create();
    $user->assignRole($this->auditor);

    expect($user->can('audit.view'))->toBeFalse();

    assignPermissions($this, $this->superAdmin, $this->auditor, ['audit.view'])->assertOk();

    expect(User::query()->findOrFail($user->id)->can('audit.view'))->toBeTrue()
        ->and(User::query()->findOrFail($user->id)->can('user.view'))->toBeFalse();
});

it('records added and removed permissions', function () {
    assignPermissions($this, $this->superAdmin, $this->auditor, ['audit.view'])->assertOk();

    $assigned = Activity::query()->where('event', 'permission.assigned')->sole();
    $revoked = Activity::query()->where('event', 'permission.revoked')->sole();

    expect($assigned->properties['permissions'])->toBe(['audit.view'])
        ->and($revoked->properties['permissions'])->toBe(['user.view'])
        ->and($assigned->causer_id)->toBe($this->superAdmin->id);
});

it('records nothing when the permissions do not change', function () {
    assignPermissions($this, $this->superAdmin, $this->auditor, ['user.view'])->assertOk();

    expect(Activity::query()->whereIn('event', ['permission.assigned', 'permission.revoked'])->exists())->toBeFalse();
});
