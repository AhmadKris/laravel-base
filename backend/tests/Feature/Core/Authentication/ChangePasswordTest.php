<?php

declare(strict_types=1);

use App\Core\Authentication\Services\SessionService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const CURRENT_PASSWORD = 'the-current-long-password';
const CHANGED_PASSWORD = 'a-different-long-password';

function changePayload(array $overrides = []): array
{
    return [
        'current_password' => CURRENT_PASSWORD,
        'password' => CHANGED_PASSWORD,
        'password_confirmation' => CHANGED_PASSWORD,
        ...$overrides,
    ];
}

function postChange(mixed $test, array $payload, ?User $user = null): mixed
{
    $user ??= User::factory()->create(['password' => CURRENT_PASSWORD]);

    return $test->actingAs($user)
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/change-password', $payload);
}

function storeSession(User $user, string $id): void
{
    DB::table('sessions')->insert(['id' => $id, 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
}

beforeEach(function () {
    $this->breachedSuffixes = '';
    Http::fake(['api.pwnedpasswords.com/*' => fn () => Http::response($this->breachedSuffixes)]);
});

it('changes the password', function () {
    $user = User::factory()->create(['password' => CURRENT_PASSWORD]);

    postChange($this, changePayload(), $user)->assertOk()->assertJsonPath('success', true);

    expect(Hash::check(CHANGED_PASSWORD, $user->refresh()->password))->toBeTrue()
        ->and(Hash::check(CURRENT_PASSWORD, $user->password))->toBeFalse();
});

it('regenerates the current session', function () {
    $user = User::factory()->create(['password' => CURRENT_PASSWORD]);
    $sessionId = Str::random(40);

    $this->actingAs($user)
        ->withHeader('Origin', 'http://localhost:5173')
        ->withCredentials()
        ->withCookie(config('session.cookie'), $sessionId)
        ->postJson('/api/v1/auth/change-password', changePayload())
        ->assertOk();

    expect(session()->getId())->not->toBe($sessionId);
});

it('ends other sessions of the user', function () {
    $user = User::factory()->create(['password' => CURRENT_PASSWORD]);
    $other = User::factory()->create();
    storeSession($user, 'old-device');
    storeSession($other, 'other-user');

    postChange($this, changePayload(), $user)->assertOk();

    expect(DB::table('sessions')->pluck('id')->all())->toBe(['other-user']);
});

it('keeps only the given session when ending other sessions', function () {
    $user = User::factory()->create();
    storeSession($user, 'current-device');
    storeSession($user, 'old-device');

    app(SessionService::class)->endOthers($user, 'current-device');

    expect(DB::table('sessions')->pluck('id')->all())->toBe(['current-device']);
});

it('records the change without any password', function () {
    $user = User::factory()->create(['password' => CURRENT_PASSWORD]);

    postChange($this, changePayload(), $user)->assertOk();

    $activity = Activity::query()->where('event', 'auth.password_changed')->sole();

    expect($activity->causer_id)->toBe($user->id)
        ->and($activity->properties->toJson())
        ->not->toContain(CURRENT_PASSWORD)
        ->not->toContain(CHANGED_PASSWORD);
});

it('rejects invalid input and keeps the password', function (array $overrides, string $field) {
    $user = User::factory()->create(['password' => CURRENT_PASSWORD]);

    postChange($this, changePayload($overrides), $user)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    expect(Hash::check(CURRENT_PASSWORD, $user->refresh()->password))->toBeTrue();
})->with([
    'wrong current password' => [['current_password' => 'not-my-current-password'], 'current_password'],
    'missing current password' => [['current_password' => null], 'current_password'],
    'too short' => [['password' => 'short-pass', 'password_confirmation' => 'short-pass'], 'password'],
    'not confirmed' => [['password_confirmation' => 'something-else-entirely'], 'password'],
    'same as current' => [['password' => CURRENT_PASSWORD, 'password_confirmation' => CURRENT_PASSWORD], 'password'],
]);

it('rejects a password found in a data breach', function () {
    $this->breachedSuffixes = substr(strtoupper(sha1(CHANGED_PASSWORD)), 5).':42';

    postChange($this, changePayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

it('rejects a guest', function () {
    $this->postJson('/api/v1/auth/change-password', changePayload())
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
});

it('limits repeated password change attempts', function () {
    $user = User::factory()->create(['password' => CURRENT_PASSWORD]);

    foreach (range(1, 5) as $attempt) {
        postChange($this, changePayload(['current_password' => 'not-my-current-password']), $user)->assertUnprocessable();
    }

    postChange($this, changePayload(), $user)
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'TOO_MANY_REQUESTS');
});

it('explains password failures in Indonesian', function () {
    $this->breachedSuffixes = strtoupper(substr(sha1('kata-sandi-yang-bocor-1'), 5)).':42';
    $user = User::factory()->create(['password' => CURRENT_PASSWORD]);

    postChange($this, changePayload(['current_password' => 'not-my-current-password']), $user)
        ->assertJsonPath('errors.current_password.0', 'Password saat ini salah.');

    postChange($this, changePayload(['password' => 'pendek', 'password_confirmation' => 'pendek']), $user)
        ->assertJsonPath('errors.password.0', 'Password minimal 12 karakter.');

    postChange($this, changePayload(['password_confirmation' => 'berbeda-dari-password-baru']), $user)
        ->assertJsonPath('errors.password.0', 'Konfirmasi password tidak sama.');

    postChange($this, changePayload(['password' => 'kata-sandi-yang-bocor-1', 'password_confirmation' => 'kata-sandi-yang-bocor-1']), $user)
        ->assertJsonPath('errors.password.0', 'Password ini pernah muncul di kebocoran data. Gunakan password lain.');
});
