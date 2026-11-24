<?php

declare(strict_types=1);

namespace App\Core\Authorization\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateRoleAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly AssignRolePermissionsAction $assignPermissions,
    ) {}

    /**
     * @param  list<string>|null  $permissions
     */
    public function execute(string $name, ?string $description, ?array $permissions, User $actor): Role
    {
        return DB::transaction(function () use ($name, $description, $permissions, $actor): Role {
            /** @var Role $role */
            $role = Role::create(['name' => $name, 'description' => $description, 'guard_name' => 'web']);

            $this->auditLogger->record('role.created', $role, ['name' => $name, 'description' => $description], $actor);

            if ($permissions !== null) {
                $this->assignPermissions->execute($role, $permissions, $role->refresh()->version, $actor);
            }

            return $role;
        });
    }
}
