<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = userWithRole('Admin');
    $this->financeUser = User::factory()->create(['name' => 'Ani']);
    $this->itUser = User::factory()->create(['name' => 'Budi']);
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

it('lists all users with roles for global roles', function () {
    $this->financeUser->forceFill(['name' => 'Qzxwy Ani'])->save();
    $this->financeUser->assignRole('Staff');

    $this->actingAs($this->admin)
        ->getJson('/api/v1/users?search=qzxwy')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->financeUser->uuid)
        ->assertJsonPath('data.0.roles', ['Staff'])
        ->assertJsonPath('data.0.status', 'active')
        ->assertJsonMissingPath('data.0.password')
        ->assertJsonMissingPath('data.0.remember_token')
        ->assertJsonMissingPath('data.0.uuid');
});

it('limits the list to the own account for other roles', function () {
    $staff = userWithRole('Staff');

    $this->actingAs($staff)
        ->getJson('/api/v1/users')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $staff->uuid);
});

it('filters and sorts the list', function () {
    $this->itUser->forceFill(['is_active' => false])->save();
    $this->financeUser->assignRole('Staff');

    $this->actingAs($this->admin)->getJson('/api/v1/users?status=inactive')
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Budi');
    $this->actingAs($this->admin)->getJson('/api/v1/users?role=Staff')
        ->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Ani');
    $this->actingAs($this->admin)->getJson('/api/v1/users?role='.str_repeat('a', 151))
        ->assertUnprocessable()->assertJsonValidationErrors('role');
    $this->actingAs($this->admin)->getJson('/api/v1/users?sort_by=password')
        ->assertUnprocessable()->assertJsonValidationErrors('sort_by');
});

it('shows other roles only their own account', function () {
    $staff = userWithRole('Staff');

    $this->actingAs($staff)->getJson("/api/v1/users/{$staff->uuid}")->assertOk();
    $this->actingAs($staff)
        ->getJson("/api/v1/users/{$this->financeUser->uuid}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('does not resolve a user by internal id or after soft delete', function () {
    $this->actingAs($this->admin)->getJson("/api/v1/users/{$this->financeUser->id}")->assertNotFound();

    $this->financeUser->delete();

    $this->actingAs($this->admin)->getJson("/api/v1/users/{$this->financeUser->uuid}")->assertNotFound();
});

it('treats wildcard characters in the search as text', function () {
    $underscore = User::factory()->create(['name' => 'Qz_x Satu']);
    User::factory()->create(['name' => 'Qzax Dua']);
    $percent = User::factory()->create(['name' => 'Diskon 100%']);

    $this->actingAs($this->admin)->getJson('/api/v1/users?search=qz_x')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $underscore->uuid);
    $this->actingAs($this->admin)->getJson('/api/v1/users?search=%25')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $percent->uuid);
});
