<?php

declare(strict_types=1);

use App\Core\Modules\ModuleCatalog;

const MODULE_TEST_SECTIONS = ['administration' => 'Administrasi', 'operations' => 'Operasional'];

/**
 * @param  array<string, mixed>  ...$modules  The content of one module.php file each.
 */
function moduleCatalogFrom(array ...$modules): ModuleCatalog
{
    $files = [];

    foreach ($modules as $module) {
        $file = tempnam(sys_get_temp_dir(), 'module');
        file_put_contents($file, '<?php return '.var_export($module, true).';');
        $files[] = $file;
    }

    try {
        return ModuleCatalog::fromFiles($files, MODULE_TEST_SECTIONS);
    } finally {
        array_map(unlink(...), $files);
    }
}

/**
 * @param  array<string, array<string, mixed>>  $menu
 * @return array<string, mixed>
 */
function moduleFile(string $key, bool $core, array $menu = []): array
{
    return ['key' => $key, 'label' => ucfirst($key), 'description' => 'Modul '.$key, 'core' => $core, 'menu' => $menu];
}

/**
 * @return array<string, mixed>
 */
function menuEntry(string $section, int $position, array $overrides = []): array
{
    return ['label' => 'Item', 'path' => '/item', 'icon' => 'box', 'permission' => null, 'section' => $section, 'position' => $position, ...$overrides];
}

it('orders menu items by section, then position', function () {
    $catalog = moduleCatalogFrom(
        moduleFile('stock', false, ['stock' => menuEntry('operations', 10)]),
        moduleFile('users', true, ['users' => menuEntry('administration', 20), 'roles' => menuEntry('administration', 10)]),
    );

    expect(array_keys($catalog->menuItems()))->toBe(['roles', 'users', 'stock'])
        ->and($catalog->menuItems()['stock']->module)->toBe('stock')
        ->and($catalog->menuItems()['users']->canHide)->toBeTrue();
});

it('lists core modules first and knows which ones may be disabled', function () {
    $catalog = moduleCatalogFrom(moduleFile('stock', false), moduleFile('audit', true), moduleFile('users', true));

    expect(array_map(fn ($module) => $module->key, $catalog->modules()))->toBe(['audit', 'users', 'stock'])
        ->and($catalog->optionalModuleKeys())->toBe(['stock']);
});

it('rejects an invalid module file', function (array $modules, string $message) {
    expect(fn () => moduleCatalogFrom(...$modules))->toThrow(LogicException::class, $message);
})->with([
    'module registered twice' => [[moduleFile('stock', false), moduleFile('stock', true)], 'Module stock is registered twice'],
    'menu item registered twice' => [
        [moduleFile('stock', false, ['items' => menuEntry('operations', 1)]), moduleFile('sales', false, ['items' => menuEntry('operations', 2)])],
        'Menu item items is registered twice',
    ],
    'unknown section' => [[moduleFile('stock', false, ['stock' => menuEntry('warehouse', 1)])], 'refers to an unknown section'],
    'relative path' => [[moduleFile('stock', false, ['stock' => menuEntry('operations', 1, ['path' => 'stock'])])], 'a path starting with /'],
    'missing core flag' => [[['key' => 'stock', 'label' => 'Stok', 'description' => 'Stok']], 'needs a key, a label, a description, and a core flag'],
]);

it('registers the base modules and their menu items', function () {
    $catalog = app(ModuleCatalog::class);

    expect(array_map(fn ($module) => $module->key, $catalog->modules()))
        ->toBe(['audit', 'system_configuration', 'user_management', 'authorization', 'notification'])
        ->and($catalog->optionalModuleKeys())->toBe(['notification'])
        ->and(array_keys($catalog->menuItems()))->toBe(['users', 'roles', 'audit-logs', 'settings'])
        ->and($catalog->menuItems()['settings']->canHide)->toBeFalse();
});
