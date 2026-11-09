<?php

declare(strict_types=1);

use App\Core\Api\Exceptions\ApiException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;

function assertApiError(mixed $response, int $status, string $code): void
{
    $response->assertStatus($status)
        ->assertJsonPath('success', false)
        ->assertJsonPath('code', $code)
        ->assertJsonPath('data', null)
        ->assertJsonPath('meta', null);
}

it('renders exceptions with a stable error code', function (Closure $throw, int $status, string $code) {
    Route::get('/api/v1/failure', $throw);

    assertApiError($this->getJson('/api/v1/failure'), $status, $code);
})->with([
    'bad request' => [fn () => abort(400), 400, 'INVALID_REQUEST'],
    'unauthenticated' => [fn () => throw new AuthenticationException, 401, 'AUTH_UNAUTHENTICATED'],
    'forbidden' => [fn () => throw new AuthorizationException, 403, 'AUTH_FORBIDDEN'],
    'model not found' => [fn () => throw new ModelNotFoundException, 404, 'RESOURCE_NOT_FOUND'],
    'business conflict' => [fn () => throw new ApiException('Taken.', 'SAMPLE_CONFLICT', 409), 409, 'SAMPLE_CONFLICT'],
    'csrf mismatch' => [fn () => throw new TokenMismatchException, 419, 'CSRF_TOKEN_MISMATCH'],
    'rate limited' => [fn () => throw new ThrottleRequestsException, 429, 'TOO_MANY_REQUESTS'],
]);

it('renders validation errors per field', function () {
    Route::post('/api/v1/failure', fn () => Validator::make([], ['email' => 'required'])->validate());

    $response = $this->postJson('/api/v1/failure');

    assertApiError($response, 422, 'VALIDATION_FAILED');
    $response->assertJsonValidationErrors('email');
});

it('renders an unknown api route as not found', function () {
    assertApiError($this->getJson('/api/v1/unknown-route'), 404, 'RESOURCE_NOT_FOUND');
});

it('hides internal details of unexpected errors even in debug mode', function () {
    config(['app.debug' => true]);
    Route::get('/api/v1/failure', fn () => throw new RuntimeException('SQLSTATE secret at C:\\app'));

    $response = $this->getJson('/api/v1/failure');

    assertApiError($response, 500, 'SYSTEM_INTERNAL_ERROR');
    expect($response->getContent())
        ->not->toContain('SQLSTATE')
        ->not->toContain('trace')
        ->not->toContain('file');
});

it('keeps the retry header on rate limited responses', function () {
    Route::get('/api/v1/failure', fn () => throw new ThrottleRequestsException(headers: ['Retry-After' => 30]));

    $this->getJson('/api/v1/failure')->assertHeader('Retry-After', '30');
});

it('attaches a request id to successful and failed responses', function () {
    Route::get('/api/v1/ok', fn () => ['ok' => true]);
    Route::get('/api/v1/failure', fn () => throw new RuntimeException('boom'));

    $success = $this->getJson('/api/v1/ok');
    $failure = $this->getJson('/api/v1/failure');

    expect($success->headers->get('X-Request-ID'))->toBeString()->not->toBeEmpty()
        ->and($failure->headers->get('X-Request-ID'))->toBeString()->not->toBeEmpty()
        ->and($success->headers->get('X-Request-ID'))->not->toBe($failure->headers->get('X-Request-ID'));
});

it('leaves non api html requests to the framework', function () {
    $response = $this->get('/page-that-does-not-exist', ['Accept' => 'text/html']);

    $response->assertNotFound();
    expect($response->headers->get('Content-Type'))->toContain('text/html');
});
