<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns the profile, roles, permissions, and department', function () {
    $this->seed(RolePermissionSeeder::class);
    $department = Department::factory()->create(['name' => 'Finance']);
    $user = User::factory()->create(['department_id' => $department->id]);
    $user->assignRole('Staff');

    $this->actingAs($user)
        ->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertExactJson([
            'success' => true,
            'message' => 'Authenticated user',
            'data' => [
                'id' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => ['Staff'],
                'permissions' => ['user.view', 'department.view'],
                'department' => ['id' => $department->uuid, 'name' => 'Finance'],
            ],
            'meta' => null,
        ]);
});

it('returns a null department for a user without one', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJsonPath('data.department', null)
        ->assertJsonPath('data.roles', [])
        ->assertJsonPath('data.permissions', []);
});

it('rejects a guest', function (array $headers) {
    $this->get('/api/v1/auth/user', $headers)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    'json client' => [['Accept' => 'application/json']],
    'client without an accept header' => [[]],
]);
