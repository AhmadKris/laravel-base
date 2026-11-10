<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Cookie;

function sessionCookie(mixed $response): ?Cookie
{
    return collect($response->headers->getCookies())
        ->first(fn ($cookie) => $cookie->getName() === config('session.cookie'));
}

it('hashes passwords with argon2id', function () {
    expect(Hash::make('a-long-password'))->toStartWith('$argon2id$');
});

it('issues an http only session cookie to the spa', function () {
    $response = $this->get('/sanctum/csrf-cookie', ['Referer' => 'http://localhost:5173/']);

    $response->assertNoContent();

    expect(sessionCookie($response)?->isHttpOnly())->toBeTrue()
        ->and(sessionCookie($response)?->getSameSite())->toBe('lax');
});

it('starts a session for api requests from the spa only', function () {
    Route::middleware('api')->get('/api/v1/session-check', fn () => ['ok' => true]);

    $fromSpa = $this->getJson('/api/v1/session-check', ['Origin' => 'http://localhost:5173']);
    $fromElsewhere = $this->getJson('/api/v1/session-check', ['Origin' => 'https://evil.example']);

    expect(sessionCookie($fromSpa))->not->toBeNull()
        ->and(sessionCookie($fromElsewhere))->toBeNull();
});

it('does not allow other origins to read the api', function (string $method) {
    $response = $this->call($method, '/api/v1/system-configurations/public', server: [
        'HTTP_ORIGIN' => 'https://evil.example',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    expect($response->headers->has('Access-Control-Allow-Origin'))->toBeFalse();
})->with(['GET', 'OPTIONS']);
