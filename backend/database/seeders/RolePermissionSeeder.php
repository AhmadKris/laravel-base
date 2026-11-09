<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    private const string GUARD = 'web';

    private const string SUPER_ADMIN = 'Super Admin';

    private const array PERMISSIONS = [
        'user.view',
        'user.create',
        'user.update',
        'user.delete',
        'user.assign_role',
        'department.view',
        'department.create',
        'department.update',
        'department.delete',
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
    ];

    private const array ROLE_PERMISSIONS = [
        'Admin' => [
            'user.view',
            'user.create',
            'user.update',
            'user.delete',
            'user.assign_role',
            'department.view',
            'department.create',
            'department.update',
            'department.delete',
            'role.view',
            'permission.view',
            'system_config.view',
            'system_config.update',
            'audit.view',
        ],
        'Staff' => ['user.view', 'department.view'],
        'Viewer' => ['user.view', 'department.view'],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, self::GUARD);
        }

        Role::findOrCreate(self::SUPER_ADMIN, self::GUARD)->syncPermissions(self::PERMISSIONS);

        foreach (self::ROLE_PERMISSIONS as $name => $permissions) {
            $role = Role::query()->firstOrCreate(['name' => $name, 'guard_name' => self::GUARD]);

            // Re-running the seeder during a deployment must not undo changes made in the application.
            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($permissions);
            }
        }
    }
}
