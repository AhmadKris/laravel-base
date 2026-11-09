<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;
use Symfony\Component\HttpFoundation\Cookie;

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
    return ['identifier' => 'user@example.com', 'password' => LOGIN_PASSWORD, ...$overrides];
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
    'unknown email' => [fn () => loginUser(), loginPayload(['identifier' => 'nobody@example.com'])],
    'unknown username' => [fn () => loginUser(), loginPayload(['identifier' => 'nobody'])],
    'inactive user by username' => [fn () => loginUser(['username' => 'user.satu', 'is_active' => false]), loginPayload(['identifier' => 'user.satu'])],
    'email text against a username' => [fn () => loginUser(['username' => 'user.satu']), loginPayload(['identifier' => 'user.satu@nowhere.test'])],
    'inactive user' => [fn () => loginUser(['is_active' => false]), loginPayload()],
    'soft deleted user' => [fn () => loginUser()->delete(), loginPayload()],
]);

it('records a failed login without the password', function () {
    loginUser();

    $this->postJson('/login', loginPayload(['password' => 'wrong-password-value']))->assertUnauthorized();

    $activity = Activity::query()->where('event', 'auth.login_failed')->sole();

    expect($activity->properties['identifier'])->toBe('user@example.com')
        ->and($activity->properties->toJson())->not->toContain('wrong-password-value');
});

it('validates the login payload', function (array $payload, string $field) {
    $this->postJson('/login', $payload)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_FAILED')
        ->assertJsonValidationErrors($field);
})->with([
    'missing identifier' => [['password' => 'secret-value'], 'identifier'],
    'oversized identifier' => [['identifier' => str_repeat('a', 256), 'password' => 'secret-value'], 'identifier'],
    'missing password' => [['identifier' => 'user@example.com'], 'password'],
    'oversized password' => [['identifier' => 'user@example.com', 'password' => str_repeat('a', 1025)], 'password'],
    'invalid remember' => [['identifier' => 'user@example.com', 'password' => 'secret-value', 'remember' => 'maybe'], 'remember'],
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

it('explains missing credentials in Indonesian', function () {
    $this->postJson('/login', [])
        ->assertJsonPath('errors.identifier.0', 'Email atau username wajib diisi.')
        ->assertJsonPath('errors.password.0', 'Password wajib diisi.');
});

it('logs in with a username', function () {
    $user = loginUser(['username' => 'user.satu']);

    $this->postJson('/login', loginPayload(['identifier' => 'user.satu']))
        ->assertOk()
        ->assertJsonPath('data.id', $user->uuid);
});

it('ignores letter case in the email and username', function (string $identifier) {
    loginUser(['username' => 'user.satu']);

    $this->postJson('/login', loginPayload(['identifier' => $identifier]))->assertOk();
})->with(['uppercase email' => 'USER@EXAMPLE.COM', 'mixed case username' => 'User.Satu']);

it('keeps the password case sensitive', function () {
    loginUser();

    $this->postJson('/login', loginPayload(['password' => strtoupper(LOGIN_PASSWORD)]))->assertUnauthorized();
});

it('limits attempts per identifier regardless of letter case', function () {
    loginUser(['username' => 'user.satu']);

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/login', loginPayload(['identifier' => 'user.satu', 'password' => 'wrong-password-value']))->assertUnauthorized();
    }

    $this->postJson('/login', loginPayload(['identifier' => 'USER.SATU']))->assertTooManyRequests();
    $this->postJson('/login', loginPayload())->assertOk();
});

function rememberCookieFrom(mixed $response): ?Cookie
{
    return collect($response->headers->getCookies())
        ->first(fn (Cookie $cookie): bool => str_starts_with($cookie->getName(), 'remember_web_'));
}

it('sets a remember cookie for 30 days when asked', function () {
    loginUser();

    $cookie = rememberCookieFrom($this->postJson('/login', loginPayload(['remember' => true]))->assertOk());

    expect($cookie)->not->toBeNull()
        ->and($cookie->getExpiresTime())->toBeGreaterThan(now()->addDays(29)->timestamp)
        ->and($cookie->getExpiresTime())->toBeLessThan(now()->addDays(31)->timestamp);
});

it('sets no remember cookie unless asked', function () {
    loginUser();

    expect(rememberCookieFrom($this->postJson('/login', loginPayload())->assertOk()))->toBeNull();
});

function requestWithRememberCookie(mixed $test, User $user, string $token): mixed
{
    return $test->withCredentials()
        ->withHeader('Origin', 'http://localhost:5173')
        ->withCookie(Auth::guard('web')->getRecallerName(), "{$user->id}|{$token}|{$user->password}")
        ->getJson('/api/v1/auth/user');
}

it('restores the session from a valid remember cookie', function () {
    $user = loginUser(['remember_token' => 'current-remember-token']);

    requestWithRememberCookie($this, $user, 'current-remember-token')->assertOk();
});

it('rejects a remember cookie whose token was rotated', function () {
    $user = loginUser(['remember_token' => 'rotated-remember-token']);

    requestWithRememberCookie($this, $user, 'previous-remember-token')->assertUnauthorized();
});
