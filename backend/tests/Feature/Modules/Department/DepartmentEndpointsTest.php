<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = userWithRole('Admin');
});

const UNKNOWN_DEPARTMENT = '01932f5e-1234-7000-8000-123456789abc';

it('rejects guests', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    ['GET', '/departments'],
    ['POST', '/departments'],
    ['GET', '/departments/'.UNKNOWN_DEPARTMENT],
    ['PATCH', '/departments/'.UNKNOWN_DEPARTMENT],
    ['DELETE', '/departments/'.UNKNOWN_DEPARTMENT],
    ['GET', '/departments/'.UNKNOWN_DEPARTMENT.'/users'],
]);

it('rejects roles without write permission before looking up the department', function (string $role, string $method, string $path) {
    $this->actingAs(userWithRole($role))
        ->json($method, '/api/v1'.$path)
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');
})->with([
    'staff cannot create' => ['Staff', 'POST', '/departments'],
    'staff cannot update' => ['Staff', 'PATCH', '/departments/'.UNKNOWN_DEPARTMENT],
    'staff cannot delete' => ['Staff', 'DELETE', '/departments/'.UNKNOWN_DEPARTMENT],
    'viewer cannot create' => ['Viewer', 'POST', '/departments'],
]);

it('lists every department for global roles', function () {
    Department::factory()->count(3)->create();

    $this->actingAs($this->admin)
        ->getJson('/api/v1/departments')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.pagination.total', 3);
});

it('lists only the own department for other roles', function () {
    $own = Department::factory()->create();
    Department::factory()->create();

    $this->actingAs(userWithRole('Staff', ['department_id' => $own->id]))
        ->getJson('/api/v1/departments')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $own->uuid);
});

it('lists nothing for a user without a department', function () {
    Department::factory()->create();

    $this->actingAs(userWithRole('Staff'))
        ->getJson('/api/v1/departments')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('filters, searches, and sorts departments', function () {
    Department::factory()->create(['code' => 'FIN', 'name' => 'Finance']);
    Department::factory()->create(['code' => 'IT', 'name' => 'Technology']);
    Department::factory()->inactive()->create(['code' => 'OLD', 'name' => 'Legacy']);

    $this->actingAs($this->admin)->getJson('/api/v1/departments?search=fin')
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'FIN');
    $this->actingAs($this->admin)->getJson('/api/v1/departments?status=inactive')
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'OLD');
    $this->actingAs($this->admin)->getJson('/api/v1/departments?sort_by=code&sort_direction=desc')
        ->assertJsonPath('data.0.code', 'OLD');
    $this->actingAs($this->admin)->getJson('/api/v1/departments?sort_by=uuid')->assertUnprocessable();
    $this->actingAs($this->admin)->getJson('/api/v1/departments?status=deleted')->assertUnprocessable();
});

it('exposes the public identifiers only', function () {
    $parent = Department::factory()->create();
    $department = Department::factory()->create(['parent_id' => $parent->id, 'code' => 'IT', 'name' => 'Technology']);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/departments/{$department->uuid}")
        ->assertOk()
        ->assertJsonPath('data.id', $department->uuid)
        ->assertJsonPath('data.parent_id', $parent->uuid)
        ->assertJsonPath('data.status', 'active')
        ->assertJsonMissingPath('data.uuid')
        ->assertJsonMissingPath('data.is_active');
});

it('shows a department only within the scope', function () {
    $own = Department::factory()->create();
    $other = Department::factory()->create();
    $staff = userWithRole('Staff', ['department_id' => $own->id]);

    $this->actingAs($staff)->getJson("/api/v1/departments/{$own->uuid}")->assertOk();
    $this->actingAs($staff)
        ->getJson("/api/v1/departments/{$other->uuid}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('does not resolve a department by internal id or after deletion', function () {
    $department = Department::factory()->create();

    $this->actingAs($this->admin)->getJson("/api/v1/departments/{$department->id}")->assertNotFound();

    $department->delete();

    $this->actingAs($this->admin)->getJson("/api/v1/departments/{$department->uuid}")->assertNotFound();
});

it('creates a department under a parent and records it', function () {
    $parent = Department::factory()->create();

    $response = $this->actingAs($this->admin)->postJson('/api/v1/departments', [
        'code' => 'IT',
        'name' => 'Information Technology',
        'description' => 'Internal systems',
        'parent_id' => $parent->uuid,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.code', 'IT')
        ->assertJsonPath('data.parent_id', $parent->uuid)
        ->assertJsonPath('data.status', 'active');

    expect(Department::query()->where('code', 'IT')->sole()->parent_id)->toBe($parent->id)
        ->and(Activity::query()->where('event', 'department.created')->sole()->causer_id)->toBe($this->admin->id);
});

it('creates an inactive department when requested', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/v1/departments', ['code' => 'OLD', 'name' => 'Legacy', 'status' => 'inactive'])
        ->assertCreated()
        ->assertJsonPath('data.status', 'inactive');
});

it('validates new departments', function (array $payload, string $field) {
    Department::factory()->create(['code' => 'IT']);
    Department::factory()->create(['code' => 'GONE'])->delete();

    $this->actingAs($this->admin)
        ->postJson('/api/v1/departments', ['code' => 'NEW', 'name' => 'New department', ...$payload])
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'missing code' => [['code' => null], 'code'],
    'duplicate code' => [['code' => 'IT'], 'code'],
    'code of a soft deleted department' => [['code' => 'GONE'], 'code'],
    'code too long' => [['code' => str_repeat('A', 51)], 'code'],
    'missing name' => [['name' => null], 'name'],
    'name too long' => [['name' => str_repeat('a', 151)], 'name'],
    'parent is not a uuid' => [['parent_id' => 123], 'parent_id'],
    'parent does not exist' => [['parent_id' => UNKNOWN_DEPARTMENT], 'parent_id'],
    'invalid status' => [['status' => 'archived'], 'status'],
]);

it('rejects a soft deleted parent', function () {
    $parent = Department::factory()->create();
    $parent->delete();

    $this->actingAs($this->admin)
        ->postJson('/api/v1/departments', ['code' => 'NEW', 'name' => 'New', 'parent_id' => $parent->uuid])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('parent_id');
});

it('updates only the given fields and records the change', function () {
    $department = Department::factory()->create(['code' => 'IT', 'name' => 'Old name']);

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/departments/{$department->uuid}", ['name' => 'New name', 'status' => 'inactive'])
        ->assertOk()
        ->assertJsonPath('data.name', 'New name')
        ->assertJsonPath('data.code', 'IT')
        ->assertJsonPath('data.status', 'inactive');

    $properties = Activity::query()->where('event', 'department.updated')->sole()->properties;

    expect($properties['old']['name'])->toBe('Old name')
        ->and($properties['new']['name'])->toBe('New name')
        ->and($properties['new'])->not->toHaveKey('updated_at');
});

it('records nothing when no field changes', function () {
    $department = Department::factory()->create(['name' => 'Same']);

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/departments/{$department->uuid}", ['name' => 'Same'])
        ->assertOk();

    expect(Activity::query()->where('event', 'department.updated')->exists())->toBeFalse();
});

it('allows a department to keep its own code', function () {
    $department = Department::factory()->create(['code' => 'IT']);

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/departments/{$department->uuid}", ['code' => 'IT'])
        ->assertOk();
});

it('rejects a code used by another department', function () {
    Department::factory()->create(['code' => 'FIN']);
    $department = Department::factory()->create(['code' => 'IT']);

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/departments/{$department->uuid}", ['code' => 'FIN'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('code');
});

it('removes the parent when null is given', function () {
    $parent = Department::factory()->create();
    $department = Department::factory()->create(['parent_id' => $parent->id]);

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/departments/{$department->uuid}", ['parent_id' => null])
        ->assertOk()
        ->assertJsonPath('data.parent_id', null);
});
