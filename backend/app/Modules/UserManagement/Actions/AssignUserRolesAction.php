<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Exceptions\PrivilegeEscalationException;
use App\Core\Authorization\Services\RoleAssignmentService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class AssignUserRolesAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly RoleAssignmentService $roleAssignment,
    ) {}

    /**
     * @param  list<string>  $roles
     *
     * @throws PrivilegeEscalationException
     */
    public function execute(User $user, array $roles, User $actor): User
    {
        if ($user->is($actor)) {
            throw new PrivilegeEscalationException;
        }

        DB::transaction(function () use ($user, $roles, $actor): void {
            User::query()->whereKey($user->id)->lockForUpdate()->sole();

            $current = $user->roles()->pluck('name')->all();
            $added = array_values(array_diff($roles, $current));
            $removed = array_values(array_diff($current, $roles));

            foreach ([...$added, ...$removed] as $role) {
                if (! $this->roleAssignment->canAssign($actor, $role)) {
                    throw new PrivilegeEscalationException;
                }
            }

            $user->syncRoles($roles);

            if ($added !== []) {
                $this->auditLogger->record('user.role_assigned', $user, ['roles' => $added], $actor);
            }

            if ($removed !== []) {
                $this->auditLogger->record('user.role_removed', $user, ['roles' => $removed], $actor);
            }
        });

        return $user;
    }
}
