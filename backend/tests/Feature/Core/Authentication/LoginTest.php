<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const LOGIN_PASSWORD = 'correct-horse-battery-staple';

function loginUser(array $attributes = []): User
{
    return User::factory()->create([
        'email' => 'user@example.com',
        'password' => LOGIN_PASSWORD,
        ...$attributes,
    ]);
}

function loginPayload(array $overrides = []): array
{
    return ['email' => 'user@example.com', 'password' => LOGIN_PASSWORD, ...$overrides];
}

it('logs in an active user and returns the profile', function () {
    $user = loginUser();

    $this->postJson('/login', loginPayload())
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', $user->uuid)
        ->assertJsonPath('data.email', 'user@example.com')
        ->assertJsonMissingPath('data.password');

    expect(Auth::guard('web')->id())->toBe($user->id)
        ->and($user->refresh()->last_login_at)->not->toBeNull();
});

it('records a successful login', function () {
    $user = loginUser();

    $this->postJson('/login', loginPayload())->assertOk();

    $activity = Activity::query()->where('event', 'auth.login')->sole();

    expect($activity->causer_id)->toBe($user->id)
        ->and($activity->subject_id)->toBe($user->id);
});

it('regenerates the session id on login', function () {
    loginUser();
    $sessionId = Str::random(40);

    $this->withCredentials()->withCookie(config('session.cookie'), $sessionId)->postJson('/login', loginPayload())->assertOk();

    expect(session()->getId())->not->toBe($sessionId);
});

it('keeps the session id when login fails', function () {
    loginUser();
    $sessionId = Str::random(40);

    $this->withCredentials()->withCookie(config('session.cookie'), $sessionId)
        ->postJson('/login', loginPayload(['password' => 'wrong-password-value']))
        ->assertUnauthorized();

    expect(session()->getId())->toBe($sessionId);
});

it('returns the same error for every failed login', function (Closure $arrange, array $payload) {
    $arrange();

    $this->postJson('/login', $payload)
        ->assertUnauthorized()
        ->assertExactJson([
            'success' => false,
            'message' => 'The provided credentials are incorrect.',
            'code' => 'AUTH_INVALID_CREDENTIALS',
            'data' => null,
            'errors' => null,
            'meta' => null,
        ]);

    expect(Auth::guard('web')->check())->toBeFalse();
})->with([
    'wrong password' => [fn () => loginUser(), loginPayload(['password' => 'wrong-password-value'])],
    'unknown email' => [fn () => loginUser(), loginPayload(['email' => 'nobody@example.com'])],
    'inactive user' => [fn () => loginUser(['is_active' => false]), loginPayload()],
    'soft deleted user' => [fn () => loginUser()->delete(), loginPayload()],
]);

it('records a failed login without the password', function () {
    loginUser();

    $this->postJson('/login', loginPayload(['password' => 'wrong-password-value']))->assertUnauthorized();

    $activity = Activity::query()->where('event', 'auth.login_failed')->sole();

    expect($activity->properties['email'])->toBe('user@example.com')
        ->and($activity->properties->toJson())->not->toContain('wrong-password-value');
});

it('validates the login payload', function (array $payload, string $field) {
    $this->postJson('/login', $payload)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_FAILED')
        ->assertJsonValidationErrors($field);
})->with([
    'missing email' => [['password' => 'secret-value'], 'email'],
    'invalid email' => [['email' => 'not-an-email', 'password' => 'secret-value'], 'email'],
    'missing password' => [['email' => 'user@example.com'], 'password'],
    'oversized password' => [['email' => 'user@example.com', 'password' => str_repeat('a', 1025)], 'password'],
]);

it('limits repeated login attempts', function () {
    loginUser();

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/login', loginPayload(['password' => 'wrong-password-value']))->assertUnauthorized();
    }

    $this->postJson('/login', loginPayload())
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'TOO_MANY_REQUESTS');
});
