<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const NEW_RESET_PASSWORD = 'a-brand-new-long-password';

function resetPayload(User $user, string $token, array $overrides = []): array
{
    return [
        'email' => $user->email,
        'token' => $token,
        'password' => NEW_RESET_PASSWORD,
        'password_confirmation' => NEW_RESET_PASSWORD,
        ...$overrides,
    ];
}

function addSessionFor(User $user, string $id): void
{
    DB::table('sessions')->insert(['id' => $id, 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
}

beforeEach(function () {
    $this->withoutDefer();
    Notification::fake();

    $this->breachedSuffixes = '';
    Http::fake(['api.pwnedpasswords.com/*' => fn () => Http::response($this->breachedSuffixes)]);
});

it('sends a reset link with the token in the url fragment', function () {
    config(['app.url' => 'https://app.example.com']);
    $user = User::factory()->create(['email' => 'user@example.com']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'user@example.com'])->assertOk();

    Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
        $url = $notification->toMail($user)->actionUrl;

        return str_starts_with($url, 'https://app.example.com/reset-password#token='.$notification->token)
            && ! str_contains(strtok($url, '#'), $notification->token);
    });
});

it('responds identically whether or not the email can be reset', function (Closure $arrange) {
    $arrange();

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'user@example.com'])
        ->assertOk()
        ->assertExactJson([
            'success' => true,
            'message' => 'If the email is registered, a password reset link has been sent.',
            'data' => null,
            'meta' => null,
        ]);
})->with([
    'registered' => [fn () => User::factory()->create(['email' => 'user@example.com'])],
    'unknown' => [fn () => null],
    'inactive' => [fn () => User::factory()->create(['email' => 'user@example.com', 'is_active' => false])],
]);

it('does not send a link to an inactive or unknown account', function () {
    User::factory()->create(['email' => 'inactive@example.com', 'is_active' => false]);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'inactive@example.com'])->assertOk();
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk();

    Notification::assertNothingSent();
});

it('resets the password with a valid token', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, Password::createToken($user)))->assertOk();

    expect(Hash::check(NEW_RESET_PASSWORD, $user->refresh()->password))->toBeTrue();
});

it('ends every session of the user but no one else', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    addSessionFor($user, 'session-of-user');
    addSessionFor($other, 'session-of-other');

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, Password::createToken($user)))->assertOk();

    expect(DB::table('sessions')->pluck('id')->all())->toBe(['session-of-other']);
});

it('records the reset without the password', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, Password::createToken($user)))->assertOk();

    $activity = Activity::query()->where('event', 'auth.password_reset')->sole();

    expect($activity->subject_id)->toBe($user->id)
        ->and($activity->properties->toJson())->not->toContain(NEW_RESET_PASSWORD);
});

it('accepts a token only once', function () {
    $user = User::factory()->create();
    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, $token))->assertOk();

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, $token, [
        'password' => 'another-long-password-value',
        'password_confirmation' => 'another-long-password-value',
    ]))->assertUnprocessable()->assertJsonPath('code', 'AUTH_PASSWORD_RESET_INVALID');

    expect(Hash::check(NEW_RESET_PASSWORD, $user->refresh()->password))->toBeTrue();
});

it('rejects an expired token', function () {
    $user = User::factory()->create();
    $token = Password::createToken($user);

    $this->travel(61)->minutes();

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, $token))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'AUTH_PASSWORD_RESET_INVALID');
});

it('rejects an invalid token and an inactive account with the same error', function (array $attributes, bool $useRealToken) {
    $user = User::factory()->create($attributes);
    $token = $useRealToken ? Password::createToken($user) : 'not-the-real-token';

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, $token))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'AUTH_PASSWORD_RESET_INVALID');
})->with([
    'invalid token' => [[], false],
    'inactive account' => [['is_active' => false], true],
]);

it('validates the new password', function (array $overrides, string $field) {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, 'any-token', $overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'too short' => [['password' => 'short-pass', 'password_confirmation' => 'short-pass'], 'password'],
    'not confirmed' => [['password_confirmation' => 'something-else-entirely'], 'password'],
    'missing token' => [['token' => null], 'token'],
    'invalid email' => [['email' => 'not-an-email'], 'email'],
]);

it('rejects a password found in a data breach', function () {
    $this->breachedSuffixes = substr(strtoupper(sha1(NEW_RESET_PASSWORD)), 5).':42';
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/reset-password', resetPayload($user, Password::createToken($user)))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

it('limits password reset requests', function () {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'user@example.com'])->assertOk();
    }

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'user@example.com'])
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'TOO_MANY_REQUESTS');
});

it('writes the reset email in Indonesian', function () {
    $mail = (new ResetPassword('token-value'))->toMail(User::factory()->create());
    $html = (string) $mail->render();

    expect($mail->subject)->toBe('Reset password akun Anda')
        ->and($mail->introLines)->toBe(['Anda menerima email ini karena ada permintaan reset password untuk akun Anda.'])
        ->and($mail->actionText)->toBe('Reset password')
        ->and($mail->outroLines)->toBe([
            'Tautan reset password ini berlaku selama 60 menit.',
            'Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak berubah.',
        ])
        ->and($html)->toContain('Halo,')
        ->toContain('Salam,')
        ->toContain('salin dan tempel URL berikut')
        ->toContain('Hak cipta dilindungi.')
        ->not->toContain('Hello!')
        ->not->toContain('Regards')
        ->not->toContain('trouble clicking');
});
