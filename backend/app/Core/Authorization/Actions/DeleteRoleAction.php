<?php

declare(strict_types=1);

namespace App\Core\Authorization\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Exceptions\RoleInUseException;
use App\Core\Authorization\Exceptions\RoleProtectedException;
use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class DeleteRoleAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws RoleProtectedException
     * @throws RoleInUseException
     */
    public function execute(Role $role, User $actor): void
    {
        if ($role->isProtected()) {
            throw new RoleProtectedException;
        }

        // Soft deleted users keep their roles and may be restored later.
        if (DB::table('model_has_roles')->where('role_id', $role->id)->exists()) {
            throw new RoleInUseException;
        }

        DB::transaction(function () use ($role, $actor): void {
            $this->auditLogger->record('role.deleted', $role, ['name' => $role->name], $actor);

            $role->delete();
        });
    }
}
