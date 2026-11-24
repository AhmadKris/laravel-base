<?php

declare(strict_types=1);

use App\Core\Authentication\Events\PasswordChanged;
use App\Modules\Notification\Models\Notification;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->superAdmin = userWithRole('Super Admin');
});

function putModules(mixed $test, User $actor, array $disabled, int $version = 1): mixed
{
    return $test->actingAs($actor)->putJson('/api/v1/modules', ['disabled' => $disabled, 'version' => $version]);
}

it('rejects guests and users who may not manage features', function () {
    $this->getJson('/api/v1/modules')->assertUnauthorized();
    $this->putJson('/api/v1/modules', [])->assertUnauthorized();

    $admin = userWithRole('Admin');
    $this->actingAs($admin)->getJson('/api/v1/modules')->assertForbidden()->assertJsonPath('code', 'AUTH_FORBIDDEN');
    putModules($this, $admin, ['notification'])->assertForbidden();

    expect(SystemConfiguration::storedValue(SystemConfiguration::DISABLED_MODULES))->toBeNull();
});

it('lists the modules with core modules first', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/modules')
        ->assertOk()
        ->assertJsonPath('data.version', 1)
        ->assertJsonPath('data.modules.*.key', ['audit', 'system_configuration', 'user_management', 'authorization', 'notification'])
        ->assertJsonPath('data.modules.4', [
            'key' => 'notification',
            'label' => 'Notifikasi',
            'description' => 'Notifikasi di dalam aplikasi tentang perubahan akun pengguna.',
            'is_core' => false,
            'enabled' => true,
        ]);
});

it('disables a module, blocks its routes, and stops it from creating data', function () {
    $user = User::factory()->create();

    putModules($this, $this->superAdmin, ['notification'])
        ->assertOk()
        ->assertJsonPath('data.version', 2)
        ->assertJsonPath('data.modules.4.enabled', false);

    $this->actingAs($user)->getJson('/api/v1/notifications')
        ->assertNotFound()
        ->assertJsonPath('code', 'MODULE_DISABLED');

    PasswordChanged::dispatch($user);

    expect(Notification::query()->count())->toBe(0)
        ->and(Activity::query()->where('event', 'system.configuration_updated')->sole()->properties['new'])
        ->toBe(['notification']);
});

it('makes a module usable again with its data kept', function () {
    $user = User::factory()->create();
    PasswordChanged::dispatch($user);

    putModules($this, $this->superAdmin, ['notification'])->assertOk();
    putModules($this, $this->superAdmin, [], 2)->assertOk()->assertJsonPath('data.modules.4.enabled', true);

    $this->actingAs($user)->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('refuses to disable a core module or an unknown one', function (string $module) {
    putModules($this, $this->superAdmin, [$module])
        ->assertUnprocessable()
        ->assertJsonPath('errors', ['disabled.0' => ['Modul inti tidak dapat dinonaktifkan.']]);
})->with(['user_management', 'warehouse']);

it('rejects a stale version', function () {
    putModules($this, $this->superAdmin, ['notification'])->assertOk();

    putModules($this, $this->superAdmin, [])
        ->assertConflict()
        ->assertJsonPath('code', 'RESOURCE_VERSION_CONFLICT');
});

it('ignores a core module stored as disabled outside the API', function () {
    SystemConfiguration::managed(SystemConfiguration::DISABLED_MODULES)->update(['value' => ['user_management']]);

    $this->actingAs($this->superAdmin)->getJson('/api/v1/users')->assertOk();
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/navigation')
        ->assertJsonPath('data.modules', ['audit', 'system_configuration', 'user_management', 'authorization', 'notification']);
});
