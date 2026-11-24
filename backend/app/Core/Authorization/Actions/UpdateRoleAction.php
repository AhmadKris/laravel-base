<?php

declare(strict_types=1);

namespace App\Core\Authorization\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Exceptions\RoleProtectedException;
use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class UpdateRoleAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly AssignRolePermissionsAction $assignPermissions,
    ) {}

    /**
     * @param  array{name?: string, description?: string|null, permissions?: list<string>, version?: int}  $changes
     *
     * @throws RoleProtectedException
     */
    public function execute(Role $role, array $changes, User $actor): Role
    {
        $isRenaming = isset($changes['name']) && $changes['name'] !== $role->name;

        if ($isRenaming && $role->isProtected()) {
            throw new RoleProtectedException;
        }

        DB::transaction(function () use ($role, $changes, $isRenaming, $actor): void {
            $properties = [];

            if ($isRenaming) {
                $properties += ['old_name' => $role->name, 'new_name' => $changes['name']];
            }

            if (array_key_exists('description', $changes) && $changes['description'] !== $role->description) {
                $properties += ['old_description' => $role->description, 'new_description' => $changes['description']];
            }

            if ($properties !== []) {
                $role->update(array_intersect_key($changes, array_flip(['name', 'description'])));

                $this->auditLogger->record('role.updated', $role, $properties, $actor);
            }

            if (isset($changes['permissions'])) {
                $this->assignPermissions->execute($role, $changes['permissions'], (int) ($changes['version'] ?? 0), $actor);
            }
        });

        return $role;
    }
}
