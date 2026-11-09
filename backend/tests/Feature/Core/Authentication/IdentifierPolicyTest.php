<?php

declare(strict_types=1);

use App\Core\Authentication\Actions\LoginAction;
use App\Core\Authentication\Actions\ResetPasswordAction;
use App\Core\Authentication\Actions\SendPasswordResetLinkAction;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

const IDENTIFIER_PASSWORD = 'correct-horse-battery-staple';

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    Http::fake(['api.pwnedpasswords.com/*' => Http::response('')]);
    $this->admin = userWithRole('Admin');
});

function postNewUser(mixed $test, array $overrides): mixed
{
    return $test->actingAs($test->admin)->postJson('/api/v1/users', [
        'name' => 'New',
        'email' => 'new@example.com',
        'password' => IDENTIFIER_PASSWORD,
        ...$overrides,
    ]);
}

function insertRawUser(array $values): void
{
    DB::table('users')->insert([
        'uuid' => (string) Str::uuid(),
        'name' => 'Raw',
        'password' => 'not-a-real-hash',
        'is_active' => true,
        ...$values,
    ]);
}

function createSuperAdminWith(mixed $test, ?string $email, ?string $username): mixed
{
    return $test->artisan('app:create-super-admin')
        ->expectsQuestion('Name', 'Root')
        ->expectsQuestion('Email', $email)
        ->expectsQuestion('Username (optional)', $username)
        ->expectsQuestion('Password', IDENTIFIER_PASSWORD)
        ->expectsQuestion('Confirm password', IDENTIFIER_PASSWORD);
}

function rawIdentifiers(User $user): array
{
    return [$user->getRawOriginal('email'), $user->getRawOriginal('username')];
}

it('finds the account whatever the case or padding of the identifier', function (string $identifier) {
    User::factory()->create(['email' => 'user@example.com', 'username' => 'user.satu', 'password' => IDENTIFIER_PASSWORD]);

    $this->postJson('/login', ['identifier' => $identifier, 'password' => IDENTIFIER_PASSWORD])->assertOk();
})->with([
    'email in another case' => 'USER@Example.COM',
    'username in another case' => 'USER.Satu',
    'padded email' => '  user@example.com  ',
    'padded username' => "\tuser.satu ",
]);

it('resets a password with the email in another case', function () {
    $user = User::factory()->create(['email' => 'user@example.com']);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'USER@EXAMPLE.COM',
        'token' => Password::createToken($user),
        'password' => 'another-long-password-value',
        'password_confirmation' => 'another-long-password-value',
    ])->assertOk();
});

it('counts differently written identifiers as one account for rate limiting', function () {
    User::factory()->create(['username' => 'user.satu', 'password' => IDENTIFIER_PASSWORD]);

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/login', ['identifier' => ' User.Satu ', 'password' => 'wrong-password-value'])->assertUnauthorized();
    }

    $this->postJson('/login', ['identifier' => 'user.satu', 'password' => IDENTIFIER_PASSWORD])->assertTooManyRequests();
});

it('keeps the password case and whitespace exactly as typed', function () {
    $password = ' Padded-Password-Value ';
    User::factory()->create(['email' => 'user@example.com', 'password' => $password]);

    foreach ([trim($password), strtolower($password), strtoupper($password)] as $wrongPassword) {
        $this->postJson('/login', ['identifier' => 'user@example.com', 'password' => $wrongPassword])->assertUnauthorized();
    }

    $this->postJson('/login', ['identifier' => 'user@example.com', 'password' => $password])->assertOk();
});

it('stores normalized identifiers when creating a user', function () {
    postNewUser($this, ['email' => '  MiXeD@Example.COM ', 'username' => ' Budi.Santoso  '])->assertCreated();

    expect(rawIdentifiers(User::query()->where('username', 'budi.santoso')->sole()))
        ->toBe(['mixed@example.com', 'budi.santoso']);
});

it('stores normalized identifiers when updating a user', function () {
    $target = userWithRole('Staff');

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/users/{$target->uuid}", ['email' => ' EDITED@Example.com ', 'username' => ' Edited.User '])
        ->assertOk()
        ->assertJsonPath('data.email', 'edited@example.com')
        ->assertJsonPath('data.username', 'edited.user');

    expect(rawIdentifiers($target->refresh()))->toBe(['edited@example.com', 'edited.user']);
});

it('stores normalized identifiers from the console', function () {
    createSuperAdminWith($this, '  ROOT@Example.COM ', '  Root.Admin  ')->assertSuccessful()->run();

    expect(rawIdentifiers(User::query()->where('username', 'root.admin')->sole()))
        ->toBe(['root@example.com', 'root.admin']);
});

it('treats a blank console username as no username', function () {
    createSuperAdminWith($this, 'root@example.com', '   ')->assertSuccessful()->run();

    expect(User::query()->where('email', 'root@example.com')->sole()->username)->toBeNull();
});

it('normalizes every model write', function () {
    $user = User::factory()->create(['email' => ' Model@Example.COM ', 'username' => ' Model.User ']);

    expect(rawIdentifiers($user->refresh()))->toBe(['model@example.com', 'model.user']);
});

it('rejects identifiers that are taken once normalized', function (string $field, string $value) {
    User::factory()->create(['email' => 'taken@example.com', 'username' => 'budi']);

    postNewUser($this, [$field => $value])
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'email case' => ['email', 'TAKEN@Example.com'],
    'email padding' => ['email', '  taken@example.com '],
    'username case' => ['username', 'BUDI'],
    'username padding' => ['username', '  Budi  '],
]);

it('rejects an update to an identifier taken once normalized', function (string $field, string $value) {
    User::factory()->create(['email' => 'taken@example.com', 'username' => 'budi']);
    $target = userWithRole('Staff');

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/users/{$target->uuid}", [$field => $value])
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'email case' => ['email', 'TAKEN@Example.com'],
    'username case' => ['username', 'BUDI'],
]);

it('rejects a console identifier taken once normalized', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    createSuperAdminWith($this, 'TAKEN@example.com', null)->assertFailed()->run();

    expect(User::query()->where('email', 'taken@example.com')->count())->toBe(1);
});

it('enforces uniqueness in the database', function (array $first, array $second) {
    insertRawUser($first);

    expect(fn () => insertRawUser($second))->toThrow(QueryException::class, 'Duplicate entry');
})->with([
    'email' => [['email' => 'raw@example.com'], ['email' => 'raw@example.com']],
    'username' => [['email' => 'a@example.com', 'username' => 'budi'], ['email' => 'b@example.com', 'username' => 'budi']],
]);

it('refuses non-normalized identifiers in the database', function (array $values) {
    expect(fn () => insertRawUser($values))->toThrow(QueryException::class, 'normalized');
})->with([
    'uppercase email' => [['email' => 'UPPER@EXAMPLE.COM']],
    'email with leading space' => [['email' => ' raw@example.com']],
    'email with trailing space' => [['email' => 'raw@example.com ']],
    'email with tab' => [['email' => "\traw@example.com"]],
    'uppercase username' => [['email' => 'a@example.com', 'username' => 'BUDI']],
    'username with leading space' => [['email' => 'a@example.com', 'username' => ' budi']],
    'username with trailing space' => [['email' => 'a@example.com', 'username' => 'budi ']],
]);

it('allows accounts without a username in the database', function () {
    insertRawUser(['email' => 'a@example.com', 'username' => null]);
    insertRawUser(['email' => 'b@example.com', 'username' => null]);

    expect(DB::table('users')->whereNull('username')->whereIn('email', ['a@example.com', 'b@example.com'])->count())->toBe(2);
});

it('normalizes the identifier in the login action itself', function () {
    $user = User::factory()->create(['username' => 'user.satu', 'password' => IDENTIFIER_PASSWORD]);

    $loggedIn = app(LoginAction::class)->execute('  USER.Satu', IDENTIFIER_PASSWORD, false, app('session.store'));

    expect($loggedIn->is($user))->toBeTrue();
});

it('normalizes the email in the forgot password action itself', function () {
    $this->withoutDefer();
    Notification::fake();
    $user = User::factory()->create(['email' => 'user@example.com']);

    app(SendPasswordResetLinkAction::class)->execute('  USER@Example.COM');

    Notification::assertSentTo($user, ResetPassword::class);
});

it('normalizes the email in the reset password action itself', function () {
    $user = User::factory()->create(['email' => 'user@example.com']);

    app(ResetPasswordAction::class)->execute('  USER@Example.COM', Password::createToken($user), 'another-long-password-value');

    expect(Hash::check('another-long-password-value', $user->refresh()->password))->toBeTrue();
});
