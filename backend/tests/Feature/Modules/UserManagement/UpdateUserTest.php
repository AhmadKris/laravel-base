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
    $this->admin = userWithRole('Admin');
    $this->target = userWithRole('Staff', ['name' => 'Old name']);
});

function patchUser(mixed $test, User $actor, User $target, array $payload): mixed
{
    return $test->actingAs($actor)->patchJson("/api/v1/users/{$target->uuid}", $payload);
}

it('updates only the given fields', function () {
    $email = $this->target->email;

    patchUser($this, $this->admin, $this->target, ['name' => 'New name'])
        ->assertOk()
        ->assertJsonPath('data.name', 'New name')
        ->assertJsonPath('data.email', $email);
});

it('records field changes', function () {
    patchUser($this, $this->admin, $this->target, ['name' => 'New name'])->assertOk();

    $properties = Activity::query()->where('event', 'user.updated')->sole()->properties;

    expect($properties['old']['name'])->toBe('Old name')
        ->and($properties['new']['name'])->toBe('New name');
});

it('records nothing when no field changes', function () {
    patchUser($this, $this->admin, $this->target, ['name' => 'Old name'])->assertOk();

    expect(Activity::query()->where('event', 'user.updated')->exists())->toBeFalse();
});

it('reactivates a user', function () {
    $this->target->forceFill(['is_active' => false])->save();

    patchUser($this, $this->admin, $this->target, ['status' => 'active'])
        ->assertOk()
        ->assertJsonPath('data.status', 'active');
});

it('ignores password and internal fields', function () {
    $password = $this->target->password;

    patchUser($this, $this->admin, $this->target, ['password' => 'a-replaced-long-password', 'is_active' => false, 'uuid' => 'x'])
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect($this->target->refresh()->password)->toBe($password);
});

it('validates updates', function (array $payload, string $field) {
    User::factory()->create(['email' => 'taken@example.com']);

    patchUser($this, $this->admin, $this->target, $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'empty name' => [['name' => ''], 'name'],
    'duplicate email' => [['email' => 'taken@example.com'], 'email'],
    'invalid status' => [['status' => 'suspended'], 'status'],
]);

it('allows keeping the own email', function () {
    patchUser($this, $this->admin, $this->target, ['email' => $this->target->email])->assertOk();
});

it('hides other users from a scoped actor with update permission', function () {
    $role = Role::query()->create(['name' => 'Scoped Editor', 'guard_name' => 'web']);
    $role->givePermissionTo('user.update');
    $actor = User::factory()->create();
    $actor->assignRole($role);

    patchUser($this, $actor, $this->target, ['name' => 'Edited'])->assertNotFound();
});

it('prevents an admin from editing a higher or equal role', function (string $role) {
    $target = userWithRole($role);
    $email = $target->email;

    patchUser($this, $this->admin, $target, ['email' => 'attacker@example.com'])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');

    expect($target->refresh()->email)->toBe($email);
})->with(['Super Admin', 'Admin']);

it('lets a super admin edit an admin', function () {
    patchUser($this, userWithRole('Super Admin'), $this->admin, ['name' => 'Edited'])->assertOk();
});

it('lets users with permission edit their own profile', function () {
    patchUser($this, $this->admin, $this->admin, ['name' => 'Edited'])->assertOk();
});

it('can keep its own username and rejects one owned by another user', function () {
    $this->target->forceFill(['username' => 'target.user'])->save();
    User::factory()->create(['username' => 'other.user']);

    patchUser($this, $this->admin, $this->target, ['username' => 'TARGET.USER'])->assertOk();
    patchUser($this, $this->admin, $this->target, ['username' => 'other.user'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('username');
});

it('changes fields and roles together', function () {
    patchUser($this, $this->admin, $this->target, ['name' => 'New name', 'roles' => ['Viewer']])
        ->assertOk()
        ->assertJsonPath('data.name', 'New name')
        ->assertJsonPath('data.roles', ['Viewer']);
});

it('keeps the old name when a requested role is refused', function () {
    patchUser($this, $this->admin, $this->target, ['name' => 'New name', 'roles' => ['Super Admin']])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');

    expect($this->target->refresh()->name)->toBe('Old name');
});

it('requires the assign permission to change roles here', function () {
    $role = Role::query()->create(['name' => 'Editor', 'guard_name' => 'web']);
    $role->givePermissionTo('user.update');
    $actor = User::factory()->create();
    $actor->assignRole($role);
    config(['authorization.assignable_roles.Editor' => ['Staff']]);
    $own = $actor;

    patchUser($this, $actor, $own, ['name' => 'Edited', 'roles' => ['Viewer']])->assertForbidden();

    expect($own->refresh()->name)->not->toBe('Edited');
});

it('does not let users change their own roles here', function () {
    patchUser($this, $this->admin, $this->admin, ['roles' => ['Viewer']])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');
});

it('leaves roles untouched when none are given', function () {
    patchUser($this, $this->admin, $this->target, ['name' => 'New name'])
        ->assertOk()
        ->assertJsonPath('data.roles', ['Staff']);
});
