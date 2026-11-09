<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->finance = Department::factory()->create();
    $this->it = Department::factory()->create();
    $this->member = User::factory()->create(['department_id' => $this->finance->id, 'name' => 'Ani']);
    User::factory()->create(['department_id' => $this->it->id]);
});

function departmentUsersUrl(Department $department, string $query = ''): string
{
    return "/api/v1/departments/{$department->uuid}/users{$query}";
}

it('lists the users of a department without sensitive fields', function () {
    $this->actingAs(userWithRole('Admin'))
        ->getJson(departmentUsersUrl($this->finance))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertExactJsonStructure([
            'success',
            'message',
            'data' => [['id', 'name', 'email', 'username', 'status', 'created_at']],
            'meta' => ['pagination' => ['current_page', 'per_page', 'total', 'last_page', 'from', 'to']],
        ])
        ->assertJsonPath('data.0.id', $this->member->uuid);
});

it('shows the own department to staff', function () {
    $staff = userWithRole('Staff', ['department_id' => $this->finance->id]);

    $this->actingAs($staff)
        ->getJson(departmentUsersUrl($this->finance))
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('hides another department from staff', function () {
    $this->actingAs(userWithRole('Staff', ['department_id' => $this->finance->id]))
        ->getJson(departmentUsersUrl($this->it))
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('requires the user view permission', function () {
    $role = Role::create(['name' => 'Department Only', 'guard_name' => 'web']);
    $role->givePermissionTo('department.view');
    $user = User::factory()->create(['department_id' => $this->finance->id]);
    $user->assignRole($role);

    $this->actingAs($user)
        ->getJson(departmentUsersUrl($this->finance))
        ->assertForbidden();
});

it('excludes soft deleted users', function () {
    $this->member->delete();

    $this->actingAs(userWithRole('Admin'))
        ->getJson(departmentUsersUrl($this->finance))
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('searches, filters, and validates the list', function () {
    $admin = userWithRole('Admin');
    User::factory()->create(['department_id' => $this->finance->id, 'name' => 'Budi', 'is_active' => false]);

    $this->actingAs($admin)->getJson(departmentUsersUrl($this->finance, '?search=bud'))
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Budi');
    $this->actingAs($admin)->getJson(departmentUsersUrl($this->finance, '?status=active'))
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Ani');
    $this->actingAs($admin)->getJson(departmentUsersUrl($this->finance, '?sort_by=password'))
        ->assertUnprocessable()->assertJsonValidationErrors('sort_by');
});
