<?php

declare(strict_types=1);

use App\Core\Authorization\Models\Role;
use App\Modules\Department\Models\Department;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Password;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const AUDIT_SECRET = 'audit-coverage-secret-password';
const AUDIT_NEW_SECRET = 'audit-coverage-new-secret-password';

function newPasswordFields(): array
{
    return ['password' => AUDIT_NEW_SECRET, 'password_confirmation' => AUDIT_NEW_SECRET];
}

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    Http::fake(['api.pwnedpasswords.com/*' => Http::response('')]);

    $this->superAdmin = userWithRole('Super Admin', ['password' => AUDIT_SECRET]);
    $this->target = User::factory()->create(['name' => 'Target']);
    $this->withRole = userWithRole('Viewer');
    $this->customRole = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
    $this->customRole->givePermissionTo('user.view');
    $this->department = Department::factory()->create();
});

it('records each sensitive action exactly once without secrets', function (string $event, Closure $action) {
    $action($this);

    $records = Activity::query()->get();

    expect($records->pluck('event')->all())->toBe([$event]);

    foreach ([AUDIT_SECRET, AUDIT_NEW_SECRET, '"password":"$'] as $secret) {
        expect(json_encode(DB::table('activity_log')->get()))->not->toContain(addslashes($secret));
    }
})->with([
    'successful login' => ['auth.login', fn ($test) => $test
        ->postJson('/login', ['identifier' => $test->superAdmin->email, 'password' => AUDIT_SECRET])
        ->assertOk()],
    'failed login' => ['auth.login_failed', fn ($test) => $test
        ->postJson('/login', ['identifier' => $test->superAdmin->email, 'password' => AUDIT_NEW_SECRET])
        ->assertUnauthorized()],
    'logout' => ['auth.logout', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->postJson('/logout')
        ->assertNoContent()],
    'password change' => ['auth.password_changed', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/change-password', ['current_password' => AUDIT_SECRET, ...newPasswordFields()])
        ->assertOk()],
    'password reset' => ['auth.password_reset', fn ($test) => $test
        ->postJson('/api/v1/auth/reset-password', [
            'email' => $test->target->email,
            'token' => Password::createToken($test->target),
            ...newPasswordFields(),
        ])
        ->assertOk()],
    'user creation' => ['user.created', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->postJson('/api/v1/users', ['name' => 'New', 'email' => 'new@example.com', 'password' => AUDIT_NEW_SECRET])
        ->assertCreated()],
    'user update' => ['user.updated', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->patchJson("/api/v1/users/{$test->target->uuid}", ['name' => 'Renamed'])
        ->assertOk()],
    'department change' => ['user.department_changed', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->patchJson("/api/v1/users/{$test->target->uuid}", ['department_id' => $test->department->uuid])
        ->assertOk()],
    'user deactivation' => ['user.deactivated', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->deleteJson("/api/v1/users/{$test->target->uuid}")
        ->assertNoContent()],
    'role assignment' => ['user.role_assigned', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->putJson("/api/v1/users/{$test->target->uuid}/roles", ['roles' => ['Staff']])
        ->assertOk()],
    'role removal' => ['user.role_removed', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->putJson("/api/v1/users/{$test->withRole->uuid}/roles", ['roles' => []])
        ->assertOk()],
    'role creation' => ['role.created', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->postJson('/api/v1/roles', ['name' => 'New Role'])
        ->assertCreated()],
    'role rename' => ['role.updated', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->patchJson("/api/v1/roles/{$test->customRole->id}", ['name' => 'Renamed Role'])
        ->assertOk()],
    'role deletion' => ['role.deleted', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->deleteJson("/api/v1/roles/{$test->customRole->id}")
        ->assertNoContent()],
    'permission grant' => ['permission.assigned', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->putJson("/api/v1/roles/{$test->customRole->id}/permissions", [
            'permissions' => ['user.view', 'audit.view'],
            'version' => 1,
        ])
        ->assertOk()],
    'permission revocation' => ['permission.revoked', fn ($test) => $test
        ->actingAs($test->superAdmin)
        ->putJson("/api/v1/roles/{$test->customRole->id}/permissions", ['permissions' => [], 'version' => 1])
        ->assertOk()],
    'configuration update' => ['system.configuration_updated', function ($test) {
        SystemConfiguration::factory()->create(['key' => 'company.name']);

        return $test->actingAs($test->superAdmin)
            ->patchJson('/api/v1/system-configurations/company.name', ['value' => 'PT Baru', 'version' => 1])
            ->assertOk();
    }],
]);
