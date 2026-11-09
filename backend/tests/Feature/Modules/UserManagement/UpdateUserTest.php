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
    $this->admin = userWithRole('Admin');
    $this->finance = Department::factory()->create(['name' => 'Finance']);
    $this->it = Department::factory()->create(['name' => 'Technology']);
    $this->target = userWithRole('Staff', ['name' => 'Old name', 'department_id' => $this->finance->id]);
});

function patchUser(mixed $test, User $actor, User $target, array $payload): mixed
{
    return $test->actingAs($actor)->patchJson("/api/v1/users/{$target->uuid}", $payload);
}

function departmentLead(Department $department): User
{
    $role = Role::query()->firstOrCreate(['name' => 'Department Lead', 'guard_name' => 'web']);
    $role->givePermissionTo('user.update');
    config(['authorization.assignable_roles.Department Lead' => ['Staff']]);

    $user = User::factory()->create(['department_id' => $department->id]);
    $user->assignRole($role);

    return $user;
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

it('moves a user to another department and records it separately', function () {
    patchUser($this, $this->admin, $this->target, ['department_id' => $this->it->uuid])
        ->assertOk()
        ->assertJsonPath('data.department.name', 'Technology');

    $activity = Activity::query()->where('event', 'user.department_changed')->sole();

    expect($activity->properties['old'])->toBe($this->finance->id)
        ->and($activity->properties['new'])->toBe($this->it->id)
        ->and(Activity::query()->where('event', 'user.updated')->exists())->toBeFalse();
});

it('removes the department when null is given', function () {
    patchUser($this, $this->admin, $this->target, ['department_id' => null])
        ->assertOk()
        ->assertJsonPath('data.department', null);
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
    'unknown department' => [['department_id' => UNKNOWN_USER], 'department_id'],
]);

it('allows keeping the own email', function () {
    patchUser($this, $this->admin, $this->target, ['email' => $this->target->email])->assertOk();
});

it('prevents a department scoped actor from moving themselves', function () {
    $lead = departmentLead($this->finance);

    patchUser($this, $lead, $lead, ['department_id' => $this->it->uuid])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');

    expect($lead->refresh()->department_id)->toBe($this->finance->id);
});

it('prevents a department scoped actor from moving others out of the department', function () {
    patchUser($this, departmentLead($this->finance), $this->target, ['department_id' => $this->it->uuid])
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');
});

it('lets a department scoped actor edit their own department without moving anyone', function () {
    patchUser($this, departmentLead($this->finance), $this->target, ['name' => 'Edited', 'department_id' => $this->finance->uuid])
        ->assertOk();
});

it('hides users outside the scope of the actor', function () {
    $outsider = userWithRole('Staff', ['department_id' => $this->it->id]);

    patchUser($this, departmentLead($this->finance), $outsider, ['name' => 'Edited'])->assertNotFound();
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
