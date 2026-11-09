<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

it('ends the session on logout', function () {
    $user = User::factory()->create();
    $sessionId = Str::random(40);

    $this->actingAs($user)
        ->withCredentials()
        ->withCookie(config('session.cookie'), $sessionId)
        ->postJson('/logout')
        ->assertNoContent();

    expect(Auth::guard('web')->check())->toBeFalse()
        ->and(session()->getId())->not->toBe($sessionId);
});

it('records the logout', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/logout')->assertNoContent();

    expect(Activity::query()->where('event', 'auth.logout')->sole()->causer_id)->toBe($user->id);
});

it('rejects logout from a guest', function () {
    $this->postJson('/logout')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
});
