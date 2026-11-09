<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = userWithRole('Admin');
    $this->target = userWithRole('Staff');
});

function sessionRowFor(User $user, string $id): void
{
    DB::table('sessions')->insert(['id' => $id, 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
}

it('deactivates without deleting the account', function () {
    $this->actingAs($this->admin)->deleteJson("/api/v1/users/{$this->target->uuid}")->assertNoContent();

    expect($this->target->refresh()->is_active)->toBeFalse()
        ->and($this->target->trashed())->toBeFalse();
});

it('ends only the sessions of that user', function () {
    sessionRowFor($this->target, 'session-of-target');
    sessionRowFor($this->admin, 'session-of-admin');

    $this->actingAs($this->admin)->deleteJson("/api/v1/users/{$this->target->uuid}")->assertNoContent();

    expect(DB::table('sessions')->pluck('id')->all())->toBe(['session-of-admin']);
});

it('records the deactivation', function () {
    $this->actingAs($this->admin)->deleteJson("/api/v1/users/{$this->target->uuid}")->assertNoContent();

    $activity = Activity::query()->where('event', 'user.deactivated')->sole();

    expect($activity->subject_id)->toBe($this->target->id)
        ->and($activity->causer_id)->toBe($this->admin->id);
});

it('does nothing for an already inactive user', function () {
    $this->target->forceFill(['is_active' => false])->save();

    $this->actingAs($this->admin)->deleteJson("/api/v1/users/{$this->target->uuid}")->assertNoContent();

    expect(Activity::query()->where('event', 'user.deactivated')->exists())->toBeFalse();
});

it('deactivates through the status field with the same effects', function () {
    sessionRowFor($this->target, 'session-of-target');

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/users/{$this->target->uuid}", ['status' => 'inactive'])
        ->assertOk()
        ->assertJsonPath('data.status', 'inactive');

    expect(DB::table('sessions')->exists())->toBeFalse()
        ->and(Activity::query()->where('event', 'user.deactivated')->count())->toBe(1)
        ->and(Activity::query()->where('event', 'user.updated')->exists())->toBeFalse();
});

it('refuses self deactivation', function (string $method, array $payload) {
    $this->actingAs($this->admin)
        ->json($method, "/api/v1/users/{$this->admin->uuid}", $payload)
        ->assertConflict()
        ->assertJsonPath('code', 'USER_SELF_DEACTIVATION');

    expect($this->admin->refresh()->is_active)->toBeTrue();
})->with([
    'delete endpoint' => ['DELETE', []],
    'status field' => ['PATCH', ['status' => 'inactive']],
]);

it('refuses to deactivate the last active super admin', function (string $method, array $payload) {
    config(['authorization.assignable_roles.Admin' => ['Super Admin', 'Staff']]);
    $superAdmin = userWithRole('Super Admin');
    userWithRole('Super Admin', ['is_active' => false]);

    $this->actingAs($this->admin)
        ->json($method, "/api/v1/users/{$superAdmin->uuid}", $payload)
        ->assertConflict()
        ->assertJsonPath('code', 'USER_LAST_SUPER_ADMIN');

    expect($superAdmin->refresh()->is_active)->toBeTrue();
})->with([
    'delete endpoint' => ['DELETE', []],
    'status field' => ['PATCH', ['status' => 'inactive']],
]);

it('allows deactivating a super admin when another remains active', function () {
    $actor = userWithRole('Super Admin');
    $superAdmin = userWithRole('Super Admin');

    $this->actingAs($actor)->deleteJson("/api/v1/users/{$superAdmin->uuid}")->assertNoContent();

    expect($superAdmin->refresh()->is_active)->toBeFalse();
});

it('prevents an admin from deactivating a higher or equal role', function (string $role) {
    $target = userWithRole($role);

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/users/{$target->uuid}")
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');

    expect($target->refresh()->is_active)->toBeTrue();
})->with(['Super Admin', 'Admin']);

it('hides users outside the scope', function () {
    $role = Role::create(['name' => 'Scoped', 'guard_name' => 'web']);
    $role->givePermissionTo('user.delete');
    $actor = User::factory()->create();
    $actor->assignRole($role);
    $outsider = User::factory()->create();

    $this->actingAs($actor)
        ->deleteJson("/api/v1/users/{$outsider->uuid}")
        ->assertNotFound();

    expect($outsider->refresh()->is_active)->toBeTrue();
});

it('invalidates the remember cookie of the deactivated user', function () {
    $this->target->forceFill(['remember_token' => 'token-before-deactivation'])->save();

    $this->actingAs($this->admin)->deleteJson("/api/v1/users/{$this->target->uuid}")->assertNoContent();

    expect($this->target->refresh()->getRememberToken())->not->toBe('token-before-deactivation');
});
