<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Core\Authorization\Permissions\PermissionCatalog;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    private const string GUARD = 'web';

    private const string SUPER_ADMIN = 'Super Admin';

    /**
     * Only applied when a role is created, so a description changed in the application stays.
     */
    private const array DESCRIPTIONS = [
        self::SUPER_ADMIN => 'Administrator tertinggi dengan seluruh permission, termasuk mengelola role dan permission.',
        'Admin' => 'Mengelola pengguna dan pengaturan perusahaan serta membaca audit log.',
        'Staff' => 'Melaksanakan aktivitas operasional pada data yang diizinkan.',
        'Viewer' => 'Hanya melihat data yang diizinkan, tanpa membuat atau mengubah data.',
    ];

    private const array ROLE_PERMISSIONS = [
        'Admin' => [
            'user.view',
            'user.create',
            'user.update',
            'user.delete',
            'user.assign_role',
            'role.view',
            'permission.view',
            'system_config.view',
            'system_config.update',
            'audit.view',
        ],
        'Staff' => ['user.view'],
        'Viewer' => ['user.view'],
    ];

    public function run(PermissionCatalog $catalog): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($catalog->names() as $permission) {
            Permission::findOrCreate($permission, self::GUARD);
        }

        Role::query()
            ->firstOrCreate(['name' => self::SUPER_ADMIN, 'guard_name' => self::GUARD], ['description' => self::DESCRIPTIONS[self::SUPER_ADMIN]])
            ->syncPermissions($catalog->names());

        foreach (self::ROLE_PERMISSIONS as $name => $permissions) {
            $role = Role::query()->firstOrCreate(['name' => $name, 'guard_name' => self::GUARD], ['description' => self::DESCRIPTIONS[$name]]);

            // Re-running the seeder during a deployment must not undo changes made in the application.
            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($permissions);
            }
        }
    }
}
