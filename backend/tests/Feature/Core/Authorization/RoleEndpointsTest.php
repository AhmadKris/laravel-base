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
});

function role(string $name): Role
{
    return Role::query()->where('name', $name)->sole();
}

it('rejects guests on every endpoint', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    ['GET', '/permissions'],
    ['GET', '/roles'],
    ['POST', '/roles'],
    ['GET', '/roles/1'],
    ['PATCH', '/roles/1'],
    ['DELETE', '/roles/1'],
    ['GET', '/roles/1/permissions'],
    ['PUT', '/roles/1/permissions'],
]);

it('rejects roles outside the matrix', function (string $role, string $method, string $path) {
    $this->actingAs(userWithRole($role))
        ->json($method, '/api/v1'.$path)
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');
})->with([
    'staff cannot list permissions' => ['Staff', 'GET', '/permissions'],
    'staff cannot list roles' => ['Staff', 'GET', '/roles'],
    'viewer cannot list roles' => ['Viewer', 'GET', '/roles'],
    'admin cannot create roles' => ['Admin', 'POST', '/roles'],
    'admin cannot update roles' => ['Admin', 'PATCH', '/roles/1'],
    'admin cannot delete roles' => ['Admin', 'DELETE', '/roles/1'],
    'admin cannot assign permissions' => ['Admin', 'PUT', '/roles/1/permissions'],
]);

it('lets an admin read roles and permissions', function () {
    $admin = userWithRole('Admin');

    $this->actingAs($admin)->getJson('/api/v1/permissions')
        ->assertOk()
        ->assertJsonCount(15, 'data')
        ->assertJsonStructure(['data' => [['id', 'name']]]);

    $this->actingAs($admin)->getJson('/api/v1/roles')->assertOk();
    $this->actingAs($admin)->getJson('/api/v1/roles/'.role('Staff')->id)->assertOk();
});

it('lists roles with pagination, search, and user counts', function () {
    userWithRole('Staff');

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles?search=sta&per_page=10')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Staff')
        ->assertJsonPath('data.0.users_count', 1)
        ->assertJsonPath('data.0.is_protected', true)
        ->assertJsonPath('meta.pagination.total', 1);
});

it('sorts roles only by allowed fields', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles?sort_by=name&sort_direction=desc')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Viewer');

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles?sort_by=guard_name')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('sort_by');
});

it('returns the permissions of a role', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles/'.role('Staff')->id.'/permissions')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'user.view')
        ->assertJsonCount(1, 'data');
});

it('returns not found for an unknown role', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles/999999')
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('creates a role and records it', function () {
    $this->actingAs($this->superAdmin)
        ->postJson('/api/v1/roles', ['name' => 'Auditor'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Auditor')
        ->assertJsonPath('data.version', 1)
        ->assertJsonPath('data.is_protected', false);

    expect(role('Auditor')->guard_name)->toBe('web')
        ->and(Activity::query()->where('event', 'role.created')->sole()->causer_id)->toBe($this->superAdmin->id);
});

it('validates new role names', function (mixed $name) {
    $this->actingAs($this->superAdmin)
        ->postJson('/api/v1/roles', ['name' => $name])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
})->with([
    'missing' => [null],
    'duplicate' => ['Staff'],
    'too long' => [str_repeat('a', 151)],
]);

it('renames a custom role and records the change', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['name' => 'Internal Auditor'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Internal Auditor');

    $properties = Activity::query()->where('event', 'role.updated')->sole()->properties;

    expect($properties['old_name'])->toBe('Auditor')
        ->and($properties['new_name'])->toBe('Internal Auditor');
});

it('allows keeping the same name when updating', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['name' => 'Auditor'])
        ->assertOk();
});

it('rejects renaming to an existing role', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['name' => 'Staff'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

it('protects built-in roles from renaming and deletion', function (string $name) {
    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.role($name)->id, ['name' => 'Renamed'])
        ->assertConflict()
        ->assertJsonPath('code', 'ROLE_PROTECTED');

    $this->actingAs($this->superAdmin)
        ->deleteJson('/api/v1/roles/'.role($name)->id)
        ->assertConflict()
        ->assertJsonPath('code', 'ROLE_PROTECTED');

    expect(Role::query()->where('name', $name)->exists())->toBeTrue();
})->with(['Super Admin', 'Admin', 'Staff', 'Viewer']);

it('deletes an unused custom role and records it', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)->deleteJson('/api/v1/roles/'.$role->id)->assertNoContent();

    expect(Role::query()->where('name', 'Auditor')->exists())->toBeFalse()
        ->and(Activity::query()->where('event', 'role.deleted')->sole()->properties['name'])->toBe('Auditor');
});

it('refuses to delete a role that is still assigned', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    User::factory()->create()->assignRole($role);

    $this->actingAs($this->superAdmin)
        ->deleteJson('/api/v1/roles/'.$role->id)
        ->assertConflict()
        ->assertJsonPath('code', 'ROLE_IN_USE');
});

it('counts a soft deleted user as still using the role', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole($role);
    $user->delete();

    $this->actingAs($this->superAdmin)
        ->deleteJson('/api/v1/roles/'.$role->id)
        ->assertConflict()
        ->assertJsonPath('code', 'ROLE_IN_USE');
});
