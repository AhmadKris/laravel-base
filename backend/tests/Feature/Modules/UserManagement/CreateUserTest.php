<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const USER_PASSWORD = 'a-suitably-long-password';

function newUserPayload(array $overrides = []): array
{
    return ['name' => 'New User', 'email' => 'new@example.com', 'password' => USER_PASSWORD, ...$overrides];
}

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = userWithRole('Admin');
    $this->department = Department::factory()->create(['name' => 'Finance']);

    $this->breachedSuffixes = '';
    Http::fake(['api.pwnedpasswords.com/*' => fn () => Http::response($this->breachedSuffixes)]);
});

it('creates a user with a hashed password that is never returned', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/users', newUserPayload([
        'department_id' => $this->department->uuid,
    ]));

    $response->assertCreated()
        ->assertJsonPath('data.email', 'new@example.com')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.department.name', 'Finance')
        ->assertJsonPath('data.roles', [])
        ->assertJsonMissingPath('data.password');

    expect($response->getContent())->not->toContain(USER_PASSWORD);

    $user = User::query()->where('email', 'new@example.com')->sole();

    expect(Hash::check(USER_PASSWORD, $user->password))->toBeTrue()
        ->and($user->department_id)->toBe($this->department->id);
});

it('records the creation without the password', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/users', newUserPayload())->assertCreated();

    $activity = Activity::query()->where('event', 'user.created')->sole();

    expect($activity->causer_id)->toBe($this->admin->id)
        ->and($activity->properties->toJson())->not->toContain(USER_PASSWORD);
});

it('creates an inactive user when requested', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/v1/users', newUserPayload(['status' => 'inactive']))
        ->assertCreated()
        ->assertJsonPath('data.status', 'inactive');
});

it('ignores fields that are not part of the contract', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/v1/users', newUserPayload(['is_admin' => true, 'uuid' => 'forced', 'roles' => ['Super Admin']]))
        ->assertCreated()
        ->assertJsonPath('data.roles', []);

    expect(User::query()->where('email', 'new@example.com')->sole()->uuid)->not->toBe('forced');
});

it('validates new users', function (array $overrides, string $field) {
    User::factory()->create(['email' => 'taken@example.com']);
    User::factory()->create(['email' => 'gone@example.com'])->delete();

    $this->actingAs($this->admin)
        ->postJson('/api/v1/users', newUserPayload($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'missing name' => [['name' => null], 'name'],
    'name too long' => [['name' => str_repeat('a', 151)], 'name'],
    'invalid email' => [['email' => 'not-an-email'], 'email'],
    'duplicate email' => [['email' => 'taken@example.com'], 'email'],
    'email of a soft deleted user' => [['email' => 'gone@example.com'], 'email'],
    'short password' => [['password' => 'short-pass'], 'password'],
    'invalid status' => [['status' => 'suspended'], 'status'],
    'unknown department' => [['department_id' => UNKNOWN_USER], 'department_id'],
]);

it('rejects a breached password', function () {
    $this->breachedSuffixes = substr(strtoupper(sha1(USER_PASSWORD)), 5).':42';

    $this->actingAs($this->admin)
        ->postJson('/api/v1/users', newUserPayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

it('prevents a department scoped actor from creating users elsewhere', function () {
    $role = Role::create(['name' => 'Department Lead', 'guard_name' => 'web']);
    $role->givePermissionTo('user.create');
    $own = Department::factory()->create();
    $actor = User::factory()->create(['department_id' => $own->id]);
    $actor->assignRole($role);

    $this->actingAs($actor)
        ->postJson('/api/v1/users', newUserPayload(['department_id' => $this->department->uuid]))
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_PRIVILEGE_ESCALATION');

    $this->actingAs($actor)
        ->postJson('/api/v1/users', newUserPayload(['department_id' => $own->uuid]))
        ->assertCreated();
});

it('stores an optional username in lowercase and returns it', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/v1/users', newUserPayload(['username' => 'Budi.Santoso']))
        ->assertCreated()
        ->assertJsonPath('data.username', 'budi.santoso');
});

it('creates a user without a username', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/v1/users', newUserPayload())
        ->assertCreated()
        ->assertJsonPath('data.username', null);
});

it('rejects an invalid or taken username', function (string $username) {
    User::factory()->create(['username' => 'budi']);

    $this->actingAs($this->admin)
        ->postJson('/api/v1/users', newUserPayload(['username' => $username]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('username');
})->with([
    'taken in another case' => 'BUDI',
    'contains at sign' => 'budi@tim',
    'contains space' => 'budi santoso',
    'too short' => 'ab',
    'too long' => str_repeat('a', 51),
]);
