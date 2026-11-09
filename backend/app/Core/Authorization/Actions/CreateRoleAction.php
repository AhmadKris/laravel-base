<?php

declare(strict_types=1);

namespace App\Core\Authorization\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateRoleAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function execute(string $name, User $actor): Role
    {
        return DB::transaction(function () use ($name, $actor): Role {
            /** @var Role $role */
            $role = Role::create(['name' => $name, 'guard_name' => 'web']);

            $this->auditLogger->record('role.created', $role, ['name' => $name], $actor);

            return $role;
        });
    }
}
