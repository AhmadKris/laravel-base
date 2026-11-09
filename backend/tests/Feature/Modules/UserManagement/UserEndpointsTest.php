<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->finance = Department::factory()->create(['name' => 'Finance']);
    $this->it = Department::factory()->create(['name' => 'Technology']);
    $this->admin = userWithRole('Admin');
    $this->financeUser = User::factory()->create(['name' => 'Ani', 'department_id' => $this->finance->id]);
    $this->itUser = User::factory()->create(['name' => 'Budi', 'department_id' => $this->it->id]);
});

it('rejects guests', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    ['GET', '/users'],
    ['POST', '/users'],
    ['GET', '/users/'.UNKNOWN_USER],
    ['PATCH', '/users/'.UNKNOWN_USER],
    ['DELETE', '/users/'.UNKNOWN_USER],
    ['GET', '/users/'.UNKNOWN_USER.'/roles'],
    ['PUT', '/users/'.UNKNOWN_USER.'/roles'],
]);

it('rejects roles outside the matrix before looking up the user', function (string $role, string $method, string $path) {
    $this->actingAs(userWithRole($role))
        ->json($method, '/api/v1'.$path)
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');
})->with([
    'staff cannot create' => ['Staff', 'POST', '/users'],
    'staff cannot update' => ['Staff', 'PATCH', '/users/'.UNKNOWN_USER],
    'staff cannot deactivate' => ['Staff', 'DELETE', '/users/'.UNKNOWN_USER],
    'staff cannot assign roles' => ['Staff', 'PUT', '/users/'.UNKNOWN_USER.'/roles'],
    'viewer cannot update' => ['Viewer', 'PATCH', '/users/'.UNKNOWN_USER],
]);

it('lists all users with department and roles for global roles', function () {
    $this->financeUser->assignRole('Staff');

    $this->actingAs($this->admin)
        ->getJson('/api/v1/users?search=ani')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->financeUser->uuid)
        ->assertJsonPath('data.0.department.name', 'Finance')
        ->assertJsonPath('data.0.roles', ['Staff'])
        ->assertJsonPath('data.0.status', 'active')
        ->assertJsonMissingPath('data.0.password')
        ->assertJsonMissingPath('data.0.remember_token')
        ->assertJsonMissingPath('data.0.uuid');
});

it('limits the list to the department for other roles', function () {
    $staff = userWithRole('Staff', ['department_id' => $this->finance->id]);

    $names = collect($this->actingAs($staff)->getJson('/api/v1/users')->assertOk()->json('data'))->pluck('id');

    expect($names->all())->toEqualCanonicalizing([$this->financeUser->uuid, $staff->uuid]);
});

it('filters and sorts the list', function () {
    $this->itUser->forceFill(['is_active' => false])->save();

    $this->actingAs($this->admin)->getJson('/api/v1/users?status=inactive')
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Budi');
    $this->actingAs($this->admin)->getJson('/api/v1/users?department_id='.$this->finance->uuid)
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Ani');
    $this->actingAs($this->admin)->getJson('/api/v1/users?sort_by=password')
        ->assertUnprocessable()->assertJsonValidationErrors('sort_by');
    $this->actingAs($this->admin)->getJson('/api/v1/users?department_id=12')
        ->assertUnprocessable()->assertJsonValidationErrors('department_id');
});

it('shows a user only within the scope', function () {
    $staff = userWithRole('Staff', ['department_id' => $this->finance->id]);

    $this->actingAs($staff)->getJson("/api/v1/users/{$this->financeUser->uuid}")->assertOk();
    $this->actingAs($staff)->getJson("/api/v1/users/{$staff->uuid}")->assertOk();
    $this->actingAs($staff)
        ->getJson("/api/v1/users/{$this->itUser->uuid}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('hides users from someone without a department', function () {
    $this->actingAs(userWithRole('Staff'))
        ->getJson('/api/v1/users/'.User::factory()->create()->uuid)
        ->assertNotFound();
});

it('does not resolve a user by internal id or after soft delete', function () {
    $this->actingAs($this->admin)->getJson("/api/v1/users/{$this->financeUser->id}")->assertNotFound();

    $this->financeUser->delete();

    $this->actingAs($this->admin)->getJson("/api/v1/users/{$this->financeUser->uuid}")->assertNotFound();
});
