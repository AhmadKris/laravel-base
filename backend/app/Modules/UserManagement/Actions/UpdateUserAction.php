<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

final class UpdateUserAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly DeactivateUserAction $deactivateUser,
        private readonly AssignUserRolesAction $assignRoles,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<string>|null  $roles
     */
    public function execute(User $user, array $attributes, ?array $roles, User $actor): User
    {
        DB::transaction(function () use ($user, $attributes, $roles, $actor): void {
            if (($attributes['is_active'] ?? null) === false) {
                $this->deactivateUser->execute($user, $actor);
                unset($attributes['is_active']);
            }

            $user->forceFill($attributes);
            $changes = $user->getDirty();
            $original = $user->getRawOriginal();
            $user->save();

            $this->recordChanges($user, $changes, $original, $actor);

            if ($roles !== null) {
                $this->assignRoles->execute($user, $roles, $actor);
            }
        });

        return $user;
    }

    /**
     * @param  array<string, mixed>  $changes
     * @param  array<string, mixed>  $original
     */
    private function recordChanges(User $user, array $changes, array $original, User $actor): void
    {
        if ($changes !== []) {
            $this->auditLogger->record('user.updated', $user, [
                'old' => Arr::only($original, array_keys($changes)),
                'new' => $changes,
            ], $actor);
        }
    }
}
