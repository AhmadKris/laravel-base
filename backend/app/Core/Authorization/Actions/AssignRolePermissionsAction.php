<?php

declare(strict_types=1);

namespace App\Core\Authorization\Actions;

use App\Core\Api\Exceptions\ResourceVersionConflictException;
use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Exceptions\PrivilegeEscalationException;
use App\Core\Authorization\Exceptions\RoleProtectedException;
use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

final class AssignRolePermissionsAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly PermissionRegistrar $permissionRegistrar,
    ) {}

    /**
     * @param  list<string>  $permissions
     *
     * @throws RoleProtectedException
     * @throws ResourceVersionConflictException
     * @throws PrivilegeEscalationException
     */
    public function execute(Role $role, array $permissions, int $version, User $actor): Role
    {
        if ($role->name === Role::SUPER_ADMIN) {
            throw new RoleProtectedException;
        }

        DB::transaction(function () use ($role, $permissions, $version, $actor): void {
            $role->updateWithVersion($version, []);

            $current = $role->permissions()->pluck('name')->all();
            $added = array_values(array_diff($permissions, $current));
            $removed = array_values(array_diff($current, $permissions));

            foreach ($added as $permission) {
                if (! $actor->can($permission)) {
                    throw new PrivilegeEscalationException;
                }
            }

            $role->syncPermissions($permissions);

            if ($added !== []) {
                $this->auditLogger->record('permission.assigned', $role, ['permissions' => $added], $actor);
            }

            if ($removed !== []) {
                $this->auditLogger->record('permission.revoked', $role, ['permissions' => $removed], $actor);
            }
        });

        $this->permissionRegistrar->forgetCachedPermissions();

        return $role;
    }
}
