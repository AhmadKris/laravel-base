<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Core\Authorization\Permissions\PermissionCatalog;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;

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
        ->assertJsonStructure(['data' => [['id', 'name', 'label', 'description', 'group', 'group_label', 'requires']]]);

    $this->actingAs($admin)->getJson('/api/v1/roles')->assertOk();
    $this->actingAs($admin)->getJson('/api/v1/roles/'.role('Staff')->id)->assertOk();
});

it('lists roles with pagination, search, user counts, and permission counts', function () {
    userWithRole('Staff');

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles?search=sta&per_page=10')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Staff')
        ->assertJsonPath('data.0.users_count', 1)
        ->assertJsonPath('data.0.permissions_count', 1)
        ->assertJsonPath('data.0.can_assign', true)
        ->assertJsonPath('data.0.is_protected', true)
        ->assertJsonPath('meta.pagination.total', 1);
});

it('reports whether the actor may assign each role', function () {
    Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    $admin = userWithRole('Admin');

    $rows = $this->actingAs($admin)
        ->getJson('/api/v1/roles')
        ->assertOk()
        ->json('data');

    $byName = collect($rows)->pluck('can_assign', 'name')->all();

    expect($byName['Staff'])->toBeTrue()
        ->and($byName['Viewer'])->toBeTrue()
        ->and($byName['Admin'])->toBeFalse()
        ->and($byName['Super Admin'])->toBeFalse()
        ->and($byName['Auditor'])->toBeFalse();
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

it('lists the permissions in catalog order with their descriptions', function () {
    $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/permissions')->assertOk();

    expect($response->json('data.*.name'))->toBe(app(PermissionCatalog::class)->names());
    $response->assertJsonPath('data.4', [
        'id' => Permission::findByName('user.assign_role', 'web')->id,
        'name' => 'user.assign_role',
        'label' => 'Tetapkan role pengguna',
        'description' => 'Mengatur role yang dimiliki pengguna lain.',
        'group' => 'user',
        'group_label' => 'Pengguna',
        'requires' => ['user.view', 'role.view'],
    ]);
});

it('leaves a permission outside the catalog out of the options', function () {
    Permission::create(['name' => 'legacy.run', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)->getJson('/api/v1/permissions')
        ->assertOk()
        ->assertJsonCount(15, 'data')
        ->assertJsonMissing(['name' => 'legacy.run']);
});

it('still shows a role permission that is no longer in the catalog', function () {
    $role = Role::create(['name' => 'Legacy', 'guard_name' => 'web']);
    $role->givePermissionTo([Permission::create(['name' => 'legacy.run', 'guard_name' => 'web']), 'audit.view', 'user.view']);

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles/'.$role->id.'/permissions')
        ->assertOk()
        ->assertJsonPath('data.*.name', ['user.view', 'audit.view', 'legacy.run'])
        ->assertJsonPath('data.2.label', 'legacy.run')
        ->assertJsonPath('data.2.group', 'legacy');
});

it('rejects permissions without their prerequisites when creating or updating', function (string $method) {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    $request = $method === 'POST'
        ? ['/api/v1/roles', ['name' => 'Gudang', 'permissions' => ['role.delete']]]
        : ['/api/v1/roles/'.$role->id, ['permissions' => ['role.delete'], 'version' => 1]];

    $this->actingAs($this->superAdmin)
        ->json($method, ...$request)
        ->assertUnprocessable()
        ->assertJsonPath('errors.permissions', ['Hapus role membutuhkan Lihat role.']);

    expect(Role::query()->where('name', 'Gudang')->exists())->toBeFalse()
        ->and($role->permissions()->count())->toBe(0);
})->with(['POST', 'PATCH']);

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

it('creates a role with a description and records it', function () {
    $this->actingAs($this->superAdmin)
        ->postJson('/api/v1/roles', ['name' => 'Gudang', 'description' => 'Staf gudang pusat.'])
        ->assertCreated()
        ->assertJsonPath('data.description', 'Staf gudang pusat.');

    expect(Activity::query()->where('event', 'role.created')->sole()->properties['description'])
        ->toBe('Staf gudang pusat.');
});

it('rejects a description longer than 500 characters', function () {
    $this->actingAs($this->superAdmin)
        ->postJson('/api/v1/roles', ['name' => 'Gudang', 'description' => str_repeat('a', 501)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('description');
});

it('changes the description of a built-in role and records the change', function () {
    $staff = role('Staff');
    $previous = $staff->description;

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$staff->id, ['name' => 'Staff', 'description' => 'Staf operasional gudang.'])
        ->assertOk()
        ->assertJsonPath('data.description', 'Staf operasional gudang.');

    $properties = Activity::query()->where('event', 'role.updated')->sole()->properties;

    expect($properties['old_description'])->toBe($previous)
        ->and($properties['new_description'])->toBe('Staf operasional gudang.')
        ->and($properties->has('old_name'))->toBeFalse();
});

it('clears a description and records nothing when nothing changed', function () {
    $role = Role::create(['name' => 'Gudang', 'description' => 'Lama', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['description' => ''])
        ->assertOk()
        ->assertJsonPath('data.description', null);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['name' => 'Gudang', 'description' => null])
        ->assertOk();

    expect(Activity::query()->where('event', 'role.updated')->count())->toBe(1);
});

it('filters roles by type', function (string $type, array $expected) {
    Role::create(['name' => 'Gudang', 'guard_name' => 'web']);

    $response = $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles?sort_by=name&type='.$type)
        ->assertOk();

    expect($response->json('data.*.name'))->toBe($expected);
})->with([
    'built in' => ['built_in', ['Admin', 'Staff', 'Super Admin', 'Viewer']],
    'custom' => ['custom', ['Gudang']],
]);

it('rejects an unknown role type', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles?type=system')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('type');
});

it('sorts roles by the number of users', function () {
    userWithRole('Staff');
    userWithRole('Staff');
    userWithRole('Viewer');

    $response = $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles?sort_by=users_count&sort_direction=desc')
        ->assertOk();

    expect(array_slice($response->json('data.*.name'), 0, 2))->toBe(['Staff', 'Super Admin']);
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

it('shows a role with its sorted permissions', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles/'.role('Admin')->id)
        ->assertOk()
        ->assertJsonPath('data.permissions.0', 'audit.view')
        ->assertJsonPath('data.users_count', 0);
});

it('leaves permissions out of the role list', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/roles')
        ->assertOk()
        ->assertJsonMissingPath('data.0.permissions');
});

it('creates a role together with its permissions', function () {
    $this->actingAs($this->superAdmin)
        ->postJson('/api/v1/roles', ['name' => 'Auditor', 'permissions' => ['audit.view', 'user.view']])
        ->assertCreated()
        ->assertJsonPath('data.permissions', ['audit.view', 'user.view'])
        ->assertJsonPath('data.version', 2);

    expect(Activity::query()->where('event', 'permission.assigned')->sole()->properties['permissions'])
        ->toBe(['audit.view', 'user.view']);
});

it('creates nothing when a requested permission is above the actor', function () {
    $role = Role::create(['name' => 'Role Writer', 'guard_name' => 'web']);
    $role->givePermissionTo(['role.create', 'permission.assign']);
    $actor = User::factory()->create();
    $actor->assignRole($role);

    $this->actingAs($actor)
        ->postJson('/api/v1/roles', ['name' => 'Auditor', 'permissions' => ['audit.view']])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');

    expect(Role::query()->where('name', 'Auditor')->exists())->toBeFalse();
});

it('requires the assign permission to set permissions while creating', function () {
    $role = Role::create(['name' => 'Role Writer', 'guard_name' => 'web']);
    $role->givePermissionTo('role.create');
    $actor = User::factory()->create();
    $actor->assignRole($role);

    $this->actingAs($actor)
        ->postJson('/api/v1/roles', ['name' => 'Auditor', 'permissions' => []])
        ->assertForbidden();

    expect(Role::query()->where('name', 'Auditor')->exists())->toBeFalse();
});

it('rejects an unknown permission while creating', function () {
    $this->actingAs($this->superAdmin)
        ->postJson('/api/v1/roles', ['name' => 'Auditor', 'permissions' => ['tidak.ada']])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('permissions.0');
});

it('renames and changes permissions together', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['name' => 'Internal Auditor', 'permissions' => ['audit.view'], 'version' => 1])
        ->assertOk()
        ->assertJsonPath('data.name', 'Internal Auditor')
        ->assertJsonPath('data.permissions', ['audit.view'])
        ->assertJsonPath('data.version', 2);
});

it('keeps the old name when the version is stale', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['name' => 'Renamed', 'permissions' => ['audit.view'], 'version' => 9])
        ->assertConflict()
        ->assertJsonPath('code', 'RESOURCE_VERSION_CONFLICT');

    expect($role->refresh()->name)->toBe('Auditor')
        ->and($role->permissions()->count())->toBe(0);
});

it('requires a version when changing permissions', function () {
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$role->id, ['permissions' => ['audit.view']])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('version');
});

it('lets a built-in role change permissions without renaming', function () {
    $staff = role('Staff');

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$staff->id, ['name' => 'Staff', 'permissions' => ['audit.view'], 'version' => $staff->version])
        ->assertOk()
        ->assertJsonPath('data.name', 'Staff')
        ->assertJsonPath('data.permissions', ['audit.view']);
});

it('never changes the super admin permissions here', function () {
    $superAdmin = role('Super Admin');

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/roles/'.$superAdmin->id, ['permissions' => [], 'version' => $superAdmin->version])
        ->assertConflict()
        ->assertJsonPath('code', 'ROLE_PROTECTED');
});

it('requires the assign permission to change permissions here', function () {
    $writer = Role::create(['name' => 'Role Writer', 'guard_name' => 'web']);
    $writer->givePermissionTo('role.update');
    $actor = User::factory()->create();
    $actor->assignRole($writer);
    $role = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    $this->actingAs($actor)
        ->patchJson('/api/v1/roles/'.$role->id, ['name' => 'Renamed', 'permissions' => [], 'version' => 1])
        ->assertForbidden();

    expect($role->refresh()->name)->toBe('Auditor');
});

it('treats wildcard characters in the search as text', function () {
    Role::create(['name' => 'Tim_A', 'guard_name' => 'web']);
    Role::create(['name' => 'TimBA', 'guard_name' => 'web']);

    $this->actingAs($this->superAdmin)->getJson('/api/v1/roles?search=tim_a')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Tim_A');
    $this->actingAs($this->superAdmin)->getJson('/api/v1/roles?search=%25')
        ->assertJsonCount(0, 'data');
});
