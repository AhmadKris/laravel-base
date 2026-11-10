<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateUserAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly AssignUserRolesAction $assignRoles,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<string>|null  $roles
     */
    public function execute(array $attributes, ?array $roles, User $actor): User
    {
        return DB::transaction(function () use ($attributes, $roles, $actor): User {
            $user = new User;
            $user->forceFill([...$attributes, 'email_verified_at' => now()])->save();

            $this->auditLogger->record('user.created', $user, ['email' => $user->email], $actor);

            if ($roles !== null) {
                $this->assignRoles->execute($user, $roles, $actor, notify: false);
            }

            return $user;
        });
    }
}
