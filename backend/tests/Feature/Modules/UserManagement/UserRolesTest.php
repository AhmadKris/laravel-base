<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    Role::create(['name' => 'Manager', 'guard_name' => 'web']);
    $this->superAdmin = userWithRole('Super Admin');
    $this->admin = userWithRole('Admin');
    $this->target = userWithRole('Viewer');
});

function putRoles(mixed $test, User $actor, User $target, array $roles): mixed
{
    return $test->actingAs($actor)->putJson("/api/v1/users/{$target->uuid}/roles", ['roles' => $roles]);
}

function currentRoles(User $user): array
{
    return $user->roles()->orderBy('name')->pluck('name')->all();
}

it('returns the roles of a user', function () {
    $this->actingAs($this->admin)
        ->getJson("/api/v1/users/{$this->target->uuid}/roles")
        ->assertOk()
        ->assertJsonPath('data.roles', ['Viewer']);
});

it('hides the roles of a user outside the scope', function () {
    $department = Department::factory()->create();
    $staff = userWithRole('Staff', ['department_id' => $department->id]);

    $this->actingAs($staff)->getJson("/api/v1/users/{$this->target->uuid}/roles")->assertNotFound();
});

it('replaces the roles of a user', function () {
    putRoles($this, $this->admin, $this->target, ['Staff', 'Manager'])
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect(currentRoles($this->target))->toBe(['Manager', 'Staff']);
});

it('can remove every role', function () {
    putRoles($this, $this->admin, $this->target, [])->assertOk();

    expect(currentRoles($this->target))->toBe([]);
});

it('applies the new permissions immediately', function () {
    expect($this->target->can('audit.view'))->toBeFalse();

    putRoles($this, $this->superAdmin, $this->target, ['Admin'])->assertOk();

    expect(User::query()->findOrFail($this->target->id)->can('audit.view'))->toBeTrue();
});

it('records assigned and removed roles', function () {
    putRoles($this, $this->admin, $this->target, ['Staff'])->assertOk();

    $assigned = Activity::query()->where('event', 'user.role_assigned')->sole();
    $removed = Activity::query()->where('event', 'user.role_removed')->sole();

    expect($assigned->properties['roles'])->toBe(['Staff'])
        ->and($removed->properties['roles'])->toBe(['Viewer'])
        ->and($assigned->causer_id)->toBe($this->admin->id);
});

it('records nothing when the roles do not change', function () {
    putRoles($this, $this->admin, $this->target, ['Viewer'])->assertOk();

    expect(Activity::query()->whereIn('event', ['user.role_assigned', 'user.role_removed'])->exists())->toBeFalse();
});

it('validates the payload', function (array $payload, string $field) {
    $this->actingAs($this->admin)
        ->putJson("/api/v1/users/{$this->target->uuid}/roles", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    expect(currentRoles($this->target))->toBe(['Viewer']);
})->with([
    'missing roles' => [[], 'roles'],
    'not a list' => [['roles' => 'Staff'], 'roles'],
    'unknown role' => [['roles' => ['Ghost']], 'roles.0'],
    'duplicate role' => [['roles' => ['Staff', 'Staff']], 'roles.0'],
]);

it('blocks an admin from granting a role above their authority', function (string $role) {
    putRoles($this, $this->admin, $this->target, ['Viewer', $role])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');

    expect(currentRoles($this->target))->toBe(['Viewer']);
})->with(['Super Admin', 'Admin']);

it('blocks changing a user who holds a role above the actor', function (string $role) {
    $target = userWithRole($role);

    putRoles($this, $this->admin, $target, [])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');

    expect(currentRoles($target))->toBe([$role]);
})->with(['Super Admin', 'Admin']);

it('blocks actors from changing their own roles', function (string $actorRole) {
    $actor = $actorRole === 'Super Admin' ? $this->superAdmin : $this->admin;

    putRoles($this, $actor, $actor, ['Staff'])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');

    expect(currentRoles($actor))->toBe([$actorRole]);
})->with(['Super Admin', 'Admin']);

it('lets a super admin grant the super admin role', function () {
    putRoles($this, $this->superAdmin, $this->target, ['Super Admin'])->assertOk();

    expect(currentRoles($this->target))->toBe(['Super Admin']);
});

it('blocks an admin from assigning a custom role', function () {
    Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

    putRoles($this, $this->admin, $this->target, ['Viewer', 'Auditor'])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');
});
