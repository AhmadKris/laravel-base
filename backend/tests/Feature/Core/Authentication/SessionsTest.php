<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->currentId = Str::random(40);
    addUserSession($this->user, $this->currentId, now()->timestamp, 'Current Browser');
});

function addUserSession(User $user, string $id, int $lastActivity, string $userAgent = 'Other Browser'): void
{
    DB::table('sessions')->insert([
        'id' => $id,
        'user_id' => $user->id,
        'ip_address' => '10.0.0.1',
        'user_agent' => $userAgent,
        'payload' => '',
        'last_activity' => $lastActivity,
    ]);
}

function asCurrentSession(mixed $test): mixed
{
    return $test->actingAs($test->user)
        ->withHeader('Origin', 'http://localhost:5173')
        ->withCredentials()
        ->withCookie(config('session.cookie'), $test->currentId);
}

it('rejects guests', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)->assertUnauthorized();
})->with([
    ['GET', '/auth/sessions'],
    ['DELETE', '/auth/sessions'],
    ['DELETE', '/auth/sessions/'.str_repeat('a', 64)],
]);

it('lists only own sessions, newest first, with hashed ids and the current one marked', function () {
    $otherId = Str::random(40);
    addUserSession($this->user, $otherId, now()->subHour()->timestamp);
    addUserSession(User::factory()->create(), Str::random(40), now()->timestamp, 'Someone Else');

    $sessions = asCurrentSession($this)->getJson('/api/v1/auth/sessions')->assertOk()->json('data');

    expect($sessions)->toHaveCount(2)
        ->and(array_column($sessions, 'id'))->toBe([hash('sha256', $this->currentId), hash('sha256', $otherId)])
        ->and(array_column($sessions, 'is_current'))->toBe([true, false])
        ->and(array_column($sessions, 'user_agent'))->toBe(['Current Browser', 'Other Browser'])
        ->and(json_encode($sessions))->not->toContain($this->currentId)->not->toContain($otherId);
});

it('ends another session and rotates the remember token', function () {
    $otherId = Str::random(40);
    addUserSession($this->user, $otherId, now()->timestamp);
    $rememberToken = $this->user->remember_token;

    asCurrentSession($this)->deleteJson('/api/v1/auth/sessions/'.hash('sha256', $otherId))->assertNoContent();

    expect(DB::table('sessions')->where('id', $otherId)->exists())->toBeFalse()
        ->and(DB::table('sessions')->where('id', $this->currentId)->exists())->toBeTrue()
        ->and($this->user->refresh()->remember_token)->not->toBe($rememberToken)
        ->and(Activity::query()->where('event', 'auth.session_revoked')->count())->toBe(1);
});

it('refuses to end the current session through this endpoint', function () {
    asCurrentSession($this)
        ->deleteJson('/api/v1/auth/sessions/'.hash('sha256', $this->currentId))
        ->assertConflict()
        ->assertJsonPath('code', 'AUTH_CURRENT_SESSION');

    expect(DB::table('sessions')->where('id', $this->currentId)->exists())->toBeTrue();
});

it('cannot end a session of another user', function () {
    $foreignId = Str::random(40);
    addUserSession(User::factory()->create(), $foreignId, now()->timestamp);

    asCurrentSession($this)->deleteJson('/api/v1/auth/sessions/'.hash('sha256', $foreignId))->assertNotFound();

    expect(DB::table('sessions')->where('id', $foreignId)->exists())->toBeTrue();
});

it('ends every other session and keeps the current one', function () {
    addUserSession($this->user, Str::random(40), now()->timestamp);
    addUserSession($this->user, Str::random(40), now()->timestamp);
    $foreignId = Str::random(40);
    addUserSession(User::factory()->create(), $foreignId, now()->timestamp);

    asCurrentSession($this)->deleteJson('/api/v1/auth/sessions')->assertOk()->assertJsonPath('data.ended', 2);

    expect(DB::table('sessions')->where('user_id', $this->user->id)->pluck('id')->all())->toBe([$this->currentId])
        ->and(DB::table('sessions')->where('id', $foreignId)->exists())->toBeTrue()
        ->and(Activity::query()->where('event', 'auth.other_sessions_revoked')->sole()->properties['count'])->toBe(2);
});
