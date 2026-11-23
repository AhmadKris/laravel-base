<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = userWithRole('Admin');
    $this->target = userWithRole('Staff');
    $auditor = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    $auditor->givePermissionTo(['audit.view', 'user.view']);
    $this->target->assignRole($auditor);
});

function permissionsUrl(User $user): string
{
    return "/api/v1/users/{$user->uuid}/permissions";
}

it('lists the permissions a user holds with the roles that grant them', function () {
    $this->actingAs($this->admin)
        ->getJson(permissionsUrl($this->target))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'user.view')
        ->assertJsonPath('data.0.label', 'Lihat pengguna')
        ->assertJsonPath('data.0.group_label', 'Pengguna')
        ->assertJsonPath('data.0.granted_by', ['Auditor', 'Staff'])
        ->assertJsonPath('data.1.name', 'audit.view')
        ->assertJsonPath('data.1.granted_by', ['Auditor']);
});

it('returns an empty list for a user without roles', function () {
    $this->actingAs($this->admin)
        ->getJson(permissionsUrl(User::factory()->create()))
        ->assertOk()
        ->assertJsonPath('data', []);
});

it('lets a user without admin access see their own permissions', function () {
    $this->actingAs($this->target)
        ->getJson(permissionsUrl($this->target))
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('hides the permissions of a user outside the scope', function () {
    $this->actingAs(userWithRole('Staff'))
        ->getJson(permissionsUrl($this->target))
        ->assertNotFound();
});

it('rejects guests and users without the view permission', function () {
    $this->getJson(permissionsUrl($this->target))
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');

    $this->actingAs(User::factory()->create())
        ->getJson(permissionsUrl($this->target))
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');
});

it('runs the same number of queries however many roles and permissions the user has', function () {
    $queries = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($this->admin)->getJson(permissionsUrl($this->target))->assertOk();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    };

    $queries();
    $withFew = $queries();

    foreach (['Role A', 'Role B', 'Role C'] as $name) {
        $role = Role::create(['name' => $name, 'guard_name' => 'web']);
        $role->givePermissionTo(['user.view', 'role.view', 'role.create', 'system_config.view']);
        $this->target->assignRole($role);
    }

    $queries();

    expect($queries())->toBe($withFew);
});
