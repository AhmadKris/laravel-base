<?php

declare(strict_types=1);

use App\Core\Audit\AuditLogger;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = userWithRole('Admin', ['name' => 'Admin Person']);
});

function recordAudit(string $event, mixed ...$arguments): Activity
{
    app(AuditLogger::class)->record($event, ...$arguments);

    return Activity::query()->latest('id')->firstOrFail();
}

it('rejects guests', function (string $path) {
    $this->getJson('/api/v1'.$path)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with(['/audit-logs', '/audit-logs/1']);

it('rejects roles without audit access', function (string $role, string $path) {
    $this->actingAs(userWithRole($role))
        ->getJson('/api/v1'.$path)
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');
})->with([
    ['Staff', '/audit-logs'],
    ['Viewer', '/audit-logs'],
    ['Staff', '/audit-logs/1'],
]);

it('does not offer any way to change audit records', function (string $method, string $path) {
    $log = recordAudit('user.created');

    $this->actingAs(userWithRole('Super Admin'))
        ->json($method, '/api/v1/audit-logs'.str_replace('{id}', (string) $log->id, $path))
        ->assertMethodNotAllowed()
        ->assertJsonPath('code', 'METHOD_NOT_ALLOWED');

    expect(Activity::query()->whereKey($log->id)->exists())->toBeTrue();
})->with([
    ['POST', ''],
    ['PUT', '/{id}'],
    ['PATCH', '/{id}'],
    ['DELETE', '/{id}'],
]);

it('shows the actor, subject, and properties', function () {
    $subject = User::factory()->create();
    $log = recordAudit('user.updated', $subject, ['new' => ['name' => 'Changed']], $this->admin);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/audit-logs/{$log->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $log->id)
        ->assertJsonPath('data.event', 'user.updated')
        ->assertJsonPath('data.actor.id', $this->admin->uuid)
        ->assertJsonPath('data.actor.name', 'Admin Person')
        ->assertJsonPath('data.subject.type', 'user')
        ->assertJsonPath('data.subject.id', $subject->uuid)
        ->assertJsonPath('data.properties.new.name', 'Changed')
        ->assertJsonStructure(['data' => ['properties' => ['context' => ['ip_address', 'user_agent', 'request_id']]]]);
});

it('keeps showing soft deleted actors and subjects', function () {
    $actor = User::factory()->create(['name' => 'Former Staff']);
    $department = Department::factory()->create();
    $log = recordAudit('department.deleted', $department, actor: $actor);
    $department->delete();
    $actor->delete();

    $this->actingAs($this->admin)
        ->getJson("/api/v1/audit-logs/{$log->id}")
        ->assertOk()
        ->assertJsonPath('data.actor.name', 'Former Staff')
        ->assertJsonPath('data.subject.type', 'department')
        ->assertJsonPath('data.subject.id', $department->uuid);
});

it('handles records without an actor or subject', function () {
    $log = recordAudit('auth.login_failed', properties: ['email' => 'user@example.com']);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/audit-logs/{$log->id}")
        ->assertOk()
        ->assertJsonPath('data.actor', null)
        ->assertJsonPath('data.subject', null);
});

it('keeps the subject type when the subject no longer exists', function () {
    $department = Department::factory()->create();
    $log = recordAudit('department.deleted', $department);
    $department->forceDelete();

    $this->actingAs($this->admin)
        ->getJson("/api/v1/audit-logs/{$log->id}")
        ->assertOk()
        ->assertJsonPath('data.subject.type', 'department')
        ->assertJsonPath('data.subject.id', null);
});

it('returns not found for unknown and non numeric ids', function (string $id) {
    $this->actingAs($this->admin)
        ->getJson("/api/v1/audit-logs/{$id}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with(['999999', 'abc']);

it('shows only records from the audit log', function () {
    activity('other')->event('other.event')->log('other.event');
    $other = Activity::query()->latest('id')->firstOrFail();

    $this->actingAs($this->admin)->getJson('/api/v1/audit-logs')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson("/api/v1/audit-logs/{$other->id}")->assertNotFound();
});

it('lists newest records first with pagination', function () {
    $this->travelTo('2026-03-01 10:00:00');
    recordAudit('user.created');
    $this->travelTo('2026-03-02 10:00:00');
    recordAudit('user.updated');

    $this->actingAs($this->admin)
        ->getJson('/api/v1/audit-logs?per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.event', 'user.updated')
        ->assertJsonPath('meta.pagination.total', 2);

    $this->actingAs($this->admin)
        ->getJson('/api/v1/audit-logs?sort_by=created_at&sort_direction=asc')
        ->assertJsonPath('data.0.event', 'user.created');
});

it('filters by user', function () {
    $other = User::factory()->create();
    recordAudit('user.created', actor: $this->admin);
    recordAudit('user.updated', actor: $other);

    $this->actingAs($this->admin)
        ->getJson('/api/v1/audit-logs?user_id='.$other->uuid)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.event', 'user.updated');
});

it('filters by module and action', function () {
    recordAudit('user.created');
    recordAudit('user.updated');
    recordAudit('auth.login');

    $this->actingAs($this->admin)->getJson('/api/v1/audit-logs?module=user')->assertJsonCount(2, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/audit-logs?action=auth.login')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.event', 'auth.login');
});

it('filters by inclusive date range', function () {
    $this->travelTo('2026-03-01 23:59:00');
    recordAudit('first.day');
    $this->travelTo('2026-03-02 00:00:00');
    recordAudit('second.day');
    $this->travelTo('2026-03-03 00:00:00');
    recordAudit('third.day');

    $this->actingAs($this->admin)
        ->getJson('/api/v1/audit-logs?date_from=2026-03-02&date_to=2026-03-02')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.event', 'second.day');

    $this->actingAs($this->admin)->getJson('/api/v1/audit-logs?date_to=2026-03-01')->assertJsonCount(1, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/audit-logs?date_from=2026-03-02')->assertJsonCount(2, 'data');
});

it('validates filters', function (string $query, string $field) {
    $this->actingAs($this->admin)
        ->getJson('/api/v1/audit-logs?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'unknown module' => ['module=finance', 'module'],
    'invalid user' => ['user_id=12', 'user_id'],
    'invalid date' => ['date_from=01-03-2026', 'date_from'],
    'reversed range' => ['date_from=2026-03-02&date_to=2026-03-01', 'date_to'],
    'column outside the allowlist' => ['sort_by=properties', 'sort_by'],
]);
