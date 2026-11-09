<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware('throttle:login')->post('/api/v1/login-sample', fn () => ['ok' => true]);
});

it('limits repeated login attempts for one account', function () {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/login-sample', ['email' => 'user@example.com'])->assertOk();
    }

    $this->postJson('/api/v1/login-sample', ['email' => 'user@example.com'])
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'TOO_MANY_REQUESTS')
        ->assertHeader('Retry-After');
});

it('treats email casing as the same account', function () {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/login-sample', ['email' => 'user@example.com'])->assertOk();
    }

    $this->postJson('/api/v1/login-sample', ['email' => 'USER@example.com'])->assertTooManyRequests();
});

it('counts attempts per account', function () {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/login-sample', ['email' => 'first@example.com'])->assertOk();
    }

    $this->postJson('/api/v1/login-sample', ['email' => 'second@example.com'])->assertOk();
});

it('applies the standard limit to api routes', function () {
    Route::middleware('api')->get('/api/v1/throttle-sample', fn () => ['ok' => true]);

    $this->getJson('/api/v1/throttle-sample')
        ->assertOk()
        ->assertHeader('X-RateLimit-Limit', '120');
});
