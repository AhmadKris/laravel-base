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
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws RoleProtectedException
     */
    public function execute(Role $role, string $name, User $actor): Role
    {
        if ($role->isProtected()) {
            throw new RoleProtectedException;
        }

        DB::transaction(function () use ($role, $name, $actor): void {
            $oldName = $role->name;

            $role->update(['name' => $name]);

            $this->auditLogger->record('role.updated', $role, ['old_name' => $oldName, 'new_name' => $name], $actor);
        });

        return $role;
    }
}
