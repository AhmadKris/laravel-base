<?php

declare(strict_types=1);

use App\Core\Modules\ModuleCatalog;
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

/**
 * Adds the optional "sample" module from the test fixtures, with a menu item in its own section.
 */
function withSampleModule(): void
{
    app()->instance(ModuleCatalog::class, ModuleCatalog::fromFiles([
        ...glob(app_path('Core/*/module.php')) ?: [],
        ...glob(app_path('Modules/*/module.php')) ?: [],
        base_path('tests/Fixtures/Modules/Sample/module.php'),
    ], ['administration' => 'Administrasi', 'operations' => 'Operasional']));
}

/**
 * @param  list<array{key: string, label: string, items: list<array<string, mixed>>}>  $sections
 */
function storeLayout(array $sections): void
{
    SystemConfiguration::managed(SystemConfiguration::NAVIGATION_LAYOUT)->update(['value' => $sections]);
}

/**
 * @param  list<string>  $keys
 * @return list<array{key: string, label: null, icon: null, hidden: bool}>
 */
function layoutItems(array $keys, array $hidden = []): array
{
    return array_map(fn (string $key): array => ['key' => $key, 'label' => null, 'icon' => null, 'hidden' => in_array($key, $hidden, true)], $keys);
}

function putLayout(mixed $test, User $actor, array $sections, int $version = 1): mixed
{
    return $test->actingAs($actor)->putJson('/api/v1/navigation/layout', ['sections' => $sections, 'version' => $version]);
}

it('rejects guests on every menu endpoint', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)->assertUnauthorized()->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    ['GET', '/navigation'],
    ['GET', '/navigation/layout'],
    ['PUT', '/navigation/layout'],
]);

it('shows the default menu to a super admin', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/navigation')
        ->assertOk()
        ->assertJsonPath('data.sections', [[
            'key' => 'administration',
            'label' => 'Administrasi',
            'items' => [
                ['key' => 'users', 'label' => 'Pengguna', 'path' => '/users', 'icon' => 'users'],
                ['key' => 'roles', 'label' => 'Role', 'path' => '/roles', 'icon' => 'shield-check'],
                ['key' => 'audit-logs', 'label' => 'Audit Log', 'path' => '/audit-logs', 'icon' => 'scroll-text'],
                ['key' => 'settings', 'label' => 'Pengaturan', 'path' => '/settings', 'icon' => 'settings'],
            ],
        ]])
        ->assertJsonPath('data.modules', ['audit', 'system_configuration', 'user_management', 'authorization', 'notification']);
});

it('shows only the items a user has the permission for', function () {
    $this->actingAs(userWithRole('Staff'))
        ->getJson('/api/v1/navigation')
        ->assertOk()
        ->assertJsonPath('data.sections.0.items.*.key', ['users']);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/navigation')
        ->assertOk()
        ->assertJsonPath('data.sections', []);
});

it('follows the stored arrangement, labels, and hidden items', function () {
    storeLayout([
        ['key' => 'security', 'label' => 'Keamanan', 'items' => [
            ['key' => 'audit-logs', 'label' => 'Jejak aktivitas', 'hidden' => false],
            ['key' => 'roles', 'label' => null, 'hidden' => true],
        ]],
        ['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['settings', 'users'])],
        ['key' => 'empty', 'label' => 'Kosong', 'items' => []],
    ]);

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/navigation')
        ->assertOk()
        ->assertJsonPath('data.sections.*.label', ['Keamanan', 'Administrasi'])
        ->assertJsonPath('data.sections.0.items.*.label', ['Jejak aktivitas'])
        ->assertJsonPath('data.sections.1.items.*.key', ['settings', 'users']);
});

it('shows the chosen icon and falls back to the registered one for an icon no longer allowed', function () {
    storeLayout([
        ['key' => 'administration', 'label' => 'Administrasi', 'items' => [
            ['key' => 'users', 'label' => null, 'icon' => 'contact', 'hidden' => false],
            ['key' => 'roles', 'label' => null, 'icon' => 'removed-icon', 'hidden' => false],
            ...layoutItems(['audit-logs', 'settings']),
        ]],
    ]);

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/navigation')
        ->assertOk()
        ->assertJsonPath('data.sections.0.items.*.icon', ['contact', 'shield-check', 'scroll-text', 'settings']);

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/navigation/layout')
        ->assertOk()
        ->assertJsonPath('data.sections.0.items.*.icon', ['contact', null, null, null]);
});

it('places items registered after the layout was saved at the end of their default section', function () {
    withSampleModule();
    storeLayout([
        ['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['settings', 'roles', 'users', 'audit-logs', 'removed-item'])],
    ]);

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/navigation')
        ->assertOk()
        ->assertJsonPath('data.sections.0.items.*.key', ['settings', 'roles', 'users', 'audit-logs'])
        ->assertJsonPath('data.sections.1', [
            'key' => 'operations',
            'label' => 'Operasional',
            'items' => [['key' => 'samples', 'label' => 'Contoh', 'path' => '/samples', 'icon' => 'box']],
        ]);
});

it('leaves the items of a disabled module out of the menu', function () {
    withSampleModule();
    SystemConfiguration::managed(SystemConfiguration::DISABLED_MODULES)->update(['value' => ['sample']]);

    $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/navigation')->assertOk();

    expect($response->json('data.sections.*.key'))->toBe(['administration'])
        ->and($response->json('data.modules'))->not->toContain('sample');
});

it('gives the editor the layout, the registered items, the default, and the version', function () {
    $this->actingAs(userWithRole('Admin'))
        ->getJson('/api/v1/navigation/layout')
        ->assertOk()
        ->assertJsonPath('data.version', 1)
        ->assertJsonPath('data.sections.0.items', layoutItems(['users', 'roles', 'audit-logs', 'settings']))
        ->assertJsonPath('data.icons', config('navigation.icons'))
        ->assertJsonPath('data.default', [['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings'])]])
        ->assertJsonPath('data.items.3', [
            'key' => 'settings',
            'module' => 'system_configuration',
            'label' => 'Pengaturan',
            'path' => '/settings',
            'icon' => 'settings',
            'can_hide' => false,
            'module_enabled' => true,
        ]);
});

it('saves a new arrangement and records the change', function () {
    $sections = [
        ['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['settings', 'users'])],
        ['key' => 'security', 'label' => 'Keamanan', 'items' => [
            ['key' => 'roles', 'label' => 'Hak akses', 'icon' => 'key', 'hidden' => false],
            ['key' => 'audit-logs', 'label' => null, 'icon' => null, 'hidden' => true],
        ]],
    ];

    putLayout($this, userWithRole('Admin'), $sections)
        ->assertOk()
        ->assertJsonPath('data.version', 2)
        ->assertJsonPath('data.sections', $sections);

    // MySQL orders the keys of a JSON object by length, so only the content is compared.
    expect(SystemConfiguration::storedValue(SystemConfiguration::NAVIGATION_LAYOUT))->toEqual($sections)
        ->and(Activity::query()->where('event', 'system.configuration_updated')->sole()->properties['key'])
        ->toBe('navigation.layout');
});

it('keeps a section without a name, whose items show without a heading', function () {
    $sections = [
        ['key' => 'bagian-2', 'label' => '', 'items' => layoutItems(['users'])],
        ['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['roles', 'audit-logs', 'settings'])],
    ];

    putLayout($this, $this->superAdmin, $sections)
        ->assertOk()
        ->assertJsonPath('data.sections.0.label', null);

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/navigation')
        ->assertOk()
        ->assertJsonPath('data.sections.0', [
            'key' => 'bagian-2',
            'label' => null,
            'items' => [['key' => 'users', 'label' => 'Pengguna', 'path' => '/users', 'icon' => 'users']],
        ]);
});

it('rejects a stale version', function () {
    $sections = [['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings'])]];

    putLayout($this, $this->superAdmin, $sections)->assertOk();
    putLayout($this, $this->superAdmin, $sections)
        ->assertConflict()
        ->assertJsonPath('code', 'RESOURCE_VERSION_CONFLICT');
});

it('validates the arrangement', function (array $sections, string $field, ?string $message = null) {
    $response = putLayout($this, $this->superAdmin, $sections)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    if ($message !== null) {
        expect($response->json('errors')[$field])->toContain($message);
    }

    expect(SystemConfiguration::storedValue(SystemConfiguration::NAVIGATION_LAYOUT))->toBeNull();
})->with([
    'item missing' => [
        [['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles', 'settings'])]],
        'sections',
        'Item menu Audit Log belum ditempatkan di bagian mana pun.',
    ],
    'unknown item' => [
        [['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings', 'reports'])]],
        'sections.0.items.4.key',
        'Item menu reports tidak terdaftar.',
    ],
    'item placed twice' => [
        [
            ['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings'])],
            ['key' => 'other', 'label' => 'Lain', 'items' => layoutItems(['users'])],
        ],
        'sections.0.items.0.key',
    ],
    'settings hidden' => [
        [['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings'], ['settings'])]],
        'sections.0.items.3.hidden',
        'Item menu Pengaturan tidak dapat disembunyikan.',
    ],
    'duplicate section key' => [
        [
            ['key' => 'administration', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles'])],
            ['key' => 'administration', 'label' => 'Lain', 'items' => layoutItems(['audit-logs', 'settings'])],
        ],
        'sections.0.key',
    ],
    'invalid section key' => [
        [['key' => 'Admin Area', 'label' => 'Administrasi', 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings'])]],
        'sections.0.key',
    ],
    'section label too long' => [
        [['key' => 'administration', 'label' => str_repeat('a', 51), 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings'])]],
        'sections.0.label',
    ],
    'section without a label field' => [
        [['key' => 'administration', 'items' => layoutItems(['users', 'roles', 'audit-logs', 'settings'])]],
        'sections.0.label',
    ],
    'item label too long' => [
        [['key' => 'administration', 'label' => 'Administrasi', 'items' => [
            ['key' => 'users', 'label' => str_repeat('a', 51), 'icon' => null, 'hidden' => false],
            ...layoutItems(['roles', 'audit-logs', 'settings']),
        ]]],
        'sections.0.items.0.label',
    ],
    'icon outside the allowed list' => [
        [['key' => 'administration', 'label' => 'Administrasi', 'items' => [
            ['key' => 'users', 'label' => null, 'icon' => 'skull', 'hidden' => false],
            ...layoutItems(['roles', 'audit-logs', 'settings']),
        ]]],
        'sections.0.items.0.icon',
    ],
    'item without an icon field' => [
        [['key' => 'administration', 'label' => 'Administrasi', 'items' => [
            ['key' => 'users', 'label' => null, 'hidden' => false],
            ...layoutItems(['roles', 'audit-logs', 'settings']),
        ]]],
        'sections.0.items.0.icon',
    ],
    'too many sections' => [
        array_map(fn (int $index): array => ['key' => "section-{$index}", 'label' => 'Bagian', 'items' => []], range(1, 21)),
        'sections',
    ],
]);

it('lets only users who may change settings edit the menu', function () {
    $staff = userWithRole('Staff');

    $this->actingAs($staff)->getJson('/api/v1/navigation/layout')->assertForbidden()->assertJsonPath('code', 'AUTH_FORBIDDEN');
    putLayout($this, $staff, [])->assertForbidden();
});

it('does not let the general configuration endpoint write the menu or the modules', function (string $key) {
    $configuration = SystemConfiguration::managed($key);

    $this->actingAs($this->superAdmin)
        ->patchJson("/api/v1/system-configurations/{$key}", ['value' => [], 'version' => $configuration->version])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('value');
})->with(['navigation.layout', 'modules.disabled']);
