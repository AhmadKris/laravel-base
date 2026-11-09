<?php

declare(strict_types=1);

use App\Core\Audit\AuditLogger;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

it('records the event with its subject, actor, and request context', function () {
    $actor = User::factory()->create();
    $subject = User::factory()->create();

    app(AuditLogger::class)->record('user.updated', $subject, ['name' => 'New name'], $actor);

    $activity = Activity::query()->sole();

    expect($activity->log_name)->toBe('audit')
        ->and($activity->event)->toBe('user.updated')
        ->and($activity->subject_id)->toBe($subject->id)
        ->and($activity->causer_id)->toBe($actor->id)
        ->and($activity->properties['name'])->toBe('New name')
        ->and($activity->properties)->toHaveKey('context.ip_address')
        ->and($activity->properties)->toHaveKey('context.request_id');
});

it('records an event without a subject or actor', function () {
    app(AuditLogger::class)->record('auth.login_failed', properties: ['email' => 'user@example.com']);

    $activity = Activity::query()->sole();

    expect($activity->subject_id)->toBeNull()
        ->and($activity->causer_id)->toBeNull()
        ->and($activity->properties['email'])->toBe('user@example.com');
});

it('never stores sensitive values', function (string $key) {
    app(AuditLogger::class)->record('sample.event', properties: [$key => 'super-secret-value']);

    expect(DB::table('activity_log')->sole()->properties)
        ->not->toContain('super-secret-value')
        ->toContain('[REDACTED]');
})->with([
    'password',
    'password_confirmation',
    'current_password',
    'remember_token',
    'access_token',
    'API_KEY',
    'client_secret',
    'Authorization',
    'session_id',
    'cookie',
]);

it('redacts sensitive values in nested data', function () {
    app(AuditLogger::class)->record('sample.event', properties: [
        'old' => ['name' => 'Ani', 'password' => 'old-secret-value'],
        'new' => [['profile' => ['api_key' => 'new-secret-value']]],
    ]);

    expect(DB::table('activity_log')->sole()->properties)
        ->toContain('Ani')
        ->not->toContain('old-secret-value')
        ->not->toContain('new-secret-value');
});
