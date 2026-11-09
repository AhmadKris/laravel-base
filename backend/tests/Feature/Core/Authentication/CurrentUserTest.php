<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns the profile, roles, and permissions', function () {
    $this->seed(RolePermissionSeeder::class);
    $user = User::factory()->create();
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
                'permissions' => ['user.view'],
            ],
            'meta' => null,
        ]);
});

it('returns empty roles and permissions for a user without any', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/auth/user')
        ->assertOk()
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
