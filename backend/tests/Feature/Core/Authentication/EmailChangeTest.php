<?php

declare(strict_types=1);

use App\Core\Authentication\Notifications\ConfirmEmailChangeNotification;
use App\Core\Authentication\Notifications\EmailChangeNotice;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const EMAIL_CHANGE_PASSWORD = 'the-current-long-password';

beforeEach(function () {
    Notification::fake();
    $this->user = User::factory()->create(['email' => 'old@example.com', 'password' => EMAIL_CHANGE_PASSWORD]);
});

function requestEmailChange(mixed $test, User $user, array $overrides = []): mixed
{
    return $test->actingAs($user)->postJson('/api/v1/account/email', [
        'email' => 'new@example.com',
        'current_password' => EMAIL_CHANGE_PASSWORD,
        ...$overrides,
    ]);
}

/**
 * @return array{id: string, token: string}
 */
function confirmationLink(): array
{
    $url = null;

    Notification::assertSentOnDemand(ConfirmEmailChangeNotification::class, function (ConfirmEmailChangeNotification $notification, array $channels, AnonymousNotifiable $notifiable) use (&$url) {
        $url = $notification->toMail($notifiable)->actionUrl;

        return true;
    });

    parse_str((string) parse_url((string) $url, PHP_URL_FRAGMENT), $query);

    /** @var array{id: string, token: string} */
    return $query;
}

it('rejects guests', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)->assertUnauthorized();
})->with([['POST', '/account/email'], ['DELETE', '/account/email']]);

it('keeps the login email until the new address is confirmed', function () {
    requestEmailChange($this, $this->user, ['email' => ' New@Example.com '])
        ->assertOk()
        ->assertJsonPath('data.email', 'new@example.com');

    $this->user->refresh();

    expect($this->user->email)->toBe('old@example.com')
        ->and($this->user->pending_email)->toBe('new@example.com')
        ->and(strlen((string) $this->user->pending_email_token))->toBe(64);

    $this->actingAs($this->user)->getJson('/api/v1/account')->assertJsonPath('data.pending_email.email', 'new@example.com');
});

it('sends the link to the new address and a notice to the current one', function () {
    config(['app.url' => 'https://app.example.com']);

    requestEmailChange($this, $this->user)->assertOk();

    Notification::assertSentOnDemand(ConfirmEmailChangeNotification::class, function (ConfirmEmailChangeNotification $notification, array $channels, AnonymousNotifiable $notifiable) {
        $url = $notification->toMail($notifiable)->actionUrl;

        return $notifiable->routes['mail'] === 'new@example.com'
            && str_starts_with($url, 'https://app.example.com/confirm-email#id='.$this->user->uuid.'&token=')
            && ! str_contains((string) strtok($url, '#'), 'token');
    });

    Notification::assertSentTo($this->user, EmailChangeNotice::class, function (EmailChangeNotice $notice) {
        $mail = $notice->toMail($this->user);

        return $mail->subject === 'Permintaan mengubah email akun Anda'
            && str_contains(implode(' ', $mail->introLines), 'ne***@example.com');
    });
});

it('stores only a hash of the token', function () {
    requestEmailChange($this, $this->user)->assertOk();

    expect($this->user->refresh()->pending_email_token)
        ->toBe(hash('sha256', confirmationLink()['token']));
});

it('validates the request', function (array $overrides, string $field) {
    User::factory()->create(['email' => 'taken@example.com']);

    requestEmailChange($this, $this->user, $overrides)->assertUnprocessable()->assertJsonValidationErrors($field);

    expect($this->user->refresh()->pending_email)->toBeNull();
    Notification::assertNothingSent();
})->with([
    'wrong password' => [['current_password' => 'not-the-password'], 'current_password'],
    'missing password' => [['current_password' => ''], 'current_password'],
    'invalid email' => [['email' => 'not-an-email'], 'email'],
    'taken email' => [['email' => 'TAKEN@example.com'], 'email'],
    'same email' => [['email' => 'old@example.com'], 'email'],
]);

it('changes the email with the link, once, and tells the previous address', function () {
    requestEmailChange($this, $this->user)->assertOk();
    $link = confirmationLink();

    $this->postJson('/api/v1/auth/email-change/confirm', $link)->assertOk();

    $this->user->refresh();

    expect($this->user->email)->toBe('new@example.com')
        ->and($this->user->email_verified_at)->not->toBeNull()
        ->and($this->user->pending_email)->toBeNull()
        ->and($this->user->pending_email_token)->toBeNull();

    Notification::assertSentOnDemand(EmailChangeNotice::class, function (EmailChangeNotice $notice, array $channels, AnonymousNotifiable $notifiable) {
        return $notifiable->routes['mail'] === 'old@example.com'
            && $notice->toMail($notifiable)->subject === 'Email akun Anda telah diubah';
    });

    $this->postJson('/api/v1/auth/email-change/confirm', $link)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'AUTH_EMAIL_CHANGE_INVALID');

    expect(Activity::query()->orderBy('id')->pluck('event')->all())->toBe(['auth.email_change_requested', 'auth.email_changed']);
});

it('rejects a link that is wrong, expired, replaced, or cancelled', function (Closure $arrange) {
    requestEmailChange($this, $this->user)->assertOk();
    $link = $arrange($this, confirmationLink());

    $this->postJson('/api/v1/auth/email-change/confirm', $link)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'AUTH_EMAIL_CHANGE_INVALID');

    expect($this->user->refresh()->email)->not->toBe('new@example.com');
})->with([
    'wrong token' => [fn ($test, array $link) => [...$link, 'token' => str_repeat('a', 64)]],
    'other user' => [fn ($test, array $link) => [...$link, 'id' => User::factory()->create()->uuid]],
    'expired' => [function ($test, array $link) {
        $test->travel(61)->minutes();

        return $link;
    }],
    'replaced by a newer request' => [function ($test, array $link) {
        requestEmailChange($test, $test->user, ['email' => 'newer@example.com'])->assertOk();

        return $link;
    }],
    'cancelled' => [function ($test, array $link) {
        $test->actingAs($test->user)->deleteJson('/api/v1/account/email')->assertNoContent();

        return $link;
    }],
    'changed by an administrator' => [function ($test, array $link) {
        $test->seed(RolePermissionSeeder::class);
        $test->actingAs(userWithRole('Super Admin'))
            ->patchJson("/api/v1/users/{$test->user->uuid}", ['email' => 'admin-set@example.com'])
            ->assertOk();

        return $link;
    }],
]);

it('rejects the link when another account took the address meanwhile', function () {
    requestEmailChange($this, $this->user)->assertOk();
    User::factory()->create(['email' => 'new@example.com']);

    $this->postJson('/api/v1/auth/email-change/confirm', confirmationLink())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    expect($this->user->refresh()->email)->toBe('old@example.com');
});

it('rejects a link for an inactive account', function () {
    requestEmailChange($this, $this->user)->assertOk();
    $this->user->forceFill(['is_active' => false])->save();

    $this->postJson('/api/v1/auth/email-change/confirm', confirmationLink())->assertJsonPath('code', 'AUTH_EMAIL_CHANGE_INVALID');
});

it('validates the confirmation payload', function () {
    $this->postJson('/api/v1/auth/email-change/confirm', ['id' => 'nope', 'token' => 'short'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['id', 'token']);
});

it('limits how often an email change can be requested', function () {
    foreach (range(1, 5) as $attempt) {
        requestEmailChange($this, $this->user, ['email' => "new{$attempt}@example.com"])->assertOk();
    }

    requestEmailChange($this, $this->user)->assertTooManyRequests();
});
