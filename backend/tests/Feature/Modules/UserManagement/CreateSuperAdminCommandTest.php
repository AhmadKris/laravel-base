<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const VALID_PASSWORD = 'correct-horse-battery-staple';

function createSuperAdmin(mixed $test, string $email = 'root@example.com', string $password = VALID_PASSWORD, ?string $confirmation = null): mixed
{
    return $test->artisan('app:create-super-admin')
        ->expectsQuestion('Name', 'Root Admin')
        ->expectsQuestion('Email', $email)
        ->expectsQuestion('Username (optional)', null)
        ->expectsQuestion('Password', $password)
        ->expectsQuestion('Confirm password', $confirmation ?? $password);
}

beforeEach(function () {
    $this->breachedSuffixes = '';

    Http::fake(['api.pwnedpasswords.com/*' => fn () => Http::response($this->breachedSuffixes)]);
});

it('creates an active verified super admin with a hashed password', function () {
    $this->seed(RolePermissionSeeder::class);

    createSuperAdmin($this)->assertSuccessful()->run();

    $user = User::query()->where('email', 'root@example.com')->sole();

    expect($user->hasRole('Super Admin'))->toBeTrue()
        ->and($user->is_active)->toBeTrue()
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->password)->toStartWith('$argon2id$')
        ->and(Hash::check(VALID_PASSWORD, $user->password))->toBeTrue();
});

it('does not print the password', function () {
    $this->seed(RolePermissionSeeder::class);

    createSuperAdmin($this)->doesntExpectOutputToContain(VALID_PASSWORD)->assertSuccessful()->run();
});

it('records the account creation in the audit log without the password', function () {
    $this->seed(RolePermissionSeeder::class);

    createSuperAdmin($this)->assertSuccessful()->run();

    $activity = Activity::query()->where('event', 'user.created')->sole();

    expect($activity->subject_id)->toBe(User::query()->sole()->id)
        ->and($activity->properties->toJson())->not->toContain(VALID_PASSWORD);
});

it('refuses to create a second super admin', function () {
    $this->seed(RolePermissionSeeder::class);
    User::factory()->create()->assignRole('Super Admin');

    $this->artisan('app:create-super-admin')->assertFailed()->run();

    expect(User::query()->count())->toBe(1);
});

it('fails when the roles have not been seeded', function () {
    $this->artisan('app:create-super-admin')->assertFailed()->run();

    expect(User::query()->count())->toBe(0);
});

it('rejects invalid input without creating an account', function (string $email, string $password, ?string $confirmation) {
    $this->seed(RolePermissionSeeder::class);

    createSuperAdmin($this, $email, $password, $confirmation)->assertFailed()->run();

    expect(User::query()->count())->toBe(0);
})->with([
    'invalid email' => ['not-an-email', VALID_PASSWORD, null],
    'password too short' => ['root@example.com', 'short-pass', null],
    'confirmation mismatch' => ['root@example.com', VALID_PASSWORD, 'different-password-value'],
]);

it('rejects a password found in a data breach', function () {
    $this->seed(RolePermissionSeeder::class);
    $this->breachedSuffixes = substr(strtoupper(sha1(VALID_PASSWORD)), 5).':42';

    createSuperAdmin($this)->assertFailed()->run();

    expect(User::query()->count())->toBe(0);
});

it('stores an optional username in lowercase', function () {
    $this->seed(RolePermissionSeeder::class);

    $this->artisan('app:create-super-admin')
        ->expectsQuestion('Name', 'Root Admin')
        ->expectsQuestion('Email', 'root@example.com')
        ->expectsQuestion('Username (optional)', 'Root.Admin')
        ->expectsQuestion('Password', VALID_PASSWORD)
        ->expectsQuestion('Confirm password', VALID_PASSWORD)
        ->assertSuccessful()
        ->run();

    expect(User::query()->sole()->username)->toBe('root.admin');
});

it('rejects a username that could be mistaken for an email', function () {
    $this->seed(RolePermissionSeeder::class);

    $this->artisan('app:create-super-admin')
        ->expectsQuestion('Name', 'Root Admin')
        ->expectsQuestion('Email', 'root@example.com')
        ->expectsQuestion('Username (optional)', 'root@admin')
        ->expectsQuestion('Password', VALID_PASSWORD)
        ->expectsQuestion('Confirm password', VALID_PASSWORD)
        ->assertFailed()
        ->run();

    expect(User::query()->count())->toBe(0);
});
