<?php

declare(strict_types=1);

use App\Core\Authorization\Permissions\PermissionCatalog;

/**
 * @param  array<string, mixed>  ...$modules  The content of one permissions.php file each.
 */
function catalogFrom(array ...$modules): PermissionCatalog
{
    $files = [];

    foreach ($modules as $groups) {
        $file = tempnam(sys_get_temp_dir(), 'permissions');
        file_put_contents($file, '<?php return '.var_export($groups, true).';');
        $files[] = $file;
    }

    try {
        return PermissionCatalog::fromFiles($files);
    } finally {
        array_map(unlink(...), $files);
    }
}

/**
 * @param  array<string, array<string, mixed>>  $permissions
 * @return array<string, mixed>
 */
function permissionGroup(string $label, int $position, array $permissions): array
{
    return ['label' => $label, 'position' => $position, 'permissions' => $permissions];
}

it('orders groups by position and keeps the declared order inside a group', function () {
    $catalog = catalogFrom(
        ['report' => permissionGroup('Laporan', 20, [
            'report.view' => ['label' => 'Lihat laporan', 'description' => 'Membuka laporan.'],
        ])],
        ['stock' => permissionGroup('Stok', 10, [
            'stock.view' => ['label' => 'Lihat stok', 'description' => 'Membuka stok.'],
            'stock.adjust' => ['label' => 'Koreksi stok', 'description' => 'Mengoreksi stok.', 'requires' => ['stock.view']],
        ])],
    );

    expect($catalog->names())->toBe(['stock.view', 'stock.adjust', 'report.view'])
        ->and($catalog->position('report.view'))->toBe(2)
        ->and($catalog->describe('stock.adjust'))->toMatchArray([
            'label' => 'Koreksi stok',
            'group' => 'stock',
            'groupLabel' => 'Stok',
            'requires' => ['stock.view'],
        ]);
});

it('reports the prerequisites missing from a selection', function () {
    $catalog = catalogFrom(['stock' => permissionGroup('Stok', 10, [
        'stock.view' => ['label' => 'Lihat stok', 'description' => 'Membuka stok.'],
        'stock.adjust' => ['label' => 'Koreksi stok', 'description' => 'Mengoreksi stok.', 'requires' => ['stock.view']],
    ])]);

    expect($catalog->missingPrerequisites(['stock.adjust']))->toBe(['stock.adjust' => ['stock.view']])
        ->and($catalog->missingPrerequisites(['stock.adjust', 'stock.view']))->toBe([]);
});

it('describes a permission it does not know by its name', function () {
    $catalog = catalogFrom();

    expect($catalog->describe('legacy.run'))->toMatchArray([
        'label' => 'legacy.run',
        'description' => '',
        'group' => 'legacy',
        'requires' => [],
    ])->and($catalog->position('legacy.run'))->toBe(PHP_INT_MAX);
});

it('rejects an invalid catalog', function (array $modules, string $message) {
    expect(fn () => catalogFrom(...$modules))->toThrow(LogicException::class, $message);
})->with([
    'permission outside its group' => [
        [['stock' => permissionGroup('Stok', 10, ['report.view' => ['label' => 'Lihat', 'description' => 'Lihat.']])]],
        'must start with stock.',
    ],
    'permission registered twice' => [
        [
            ['stock' => permissionGroup('Stok', 10, ['stock.view' => ['label' => 'Lihat', 'description' => 'Lihat.']])],
            ['stock' => permissionGroup('Stok', 20, ['stock.view' => ['label' => 'Lihat', 'description' => 'Lihat.']])],
        ],
        'stock.view is registered twice',
    ],
    'unknown prerequisite' => [
        [['stock' => permissionGroup('Stok', 10, ['stock.adjust' => ['label' => 'Koreksi', 'description' => 'Koreksi.', 'requires' => ['stock.view']]])]],
        'requires unknown permission stock.view',
    ],
    'permission without a description' => [
        [['stock' => permissionGroup('Stok', 10, ['stock.view' => ['label' => 'Lihat']])]],
        'needs a label and a description',
    ],
    'group without a position' => [
        [['stock' => ['label' => 'Stok', 'permissions' => []]]],
        'needs a label, a position, and permissions',
    ],
]);

it('describes every permission the application registers', function () {
    $catalog = app(PermissionCatalog::class);

    expect($catalog->names())->toBe([
        'user.view',
        'user.create',
        'user.update',
        'user.delete',
        'user.assign_role',
        'role.view',
        'role.create',
        'role.update',
        'role.delete',
        'permission.view',
        'permission.assign',
        'system_config.view',
        'system_config.update',
        'system_config.feature_flags',
        'audit.view',
    ]);
});
