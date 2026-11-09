<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Exceptions\PrivilegeEscalationException;
use App\Modules\Department\Services\DepartmentAccessService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

final class UpdateUserAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly DepartmentAccessService $accessService,
        private readonly DeactivateUserAction $deactivateUser,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws PrivilegeEscalationException
     */
    public function execute(User $user, array $attributes, User $actor): User
    {
        DB::transaction(function () use ($user, $attributes, $actor): void {
            if (
                array_key_exists('department_id', $attributes)
                && $attributes['department_id'] !== $user->department_id
                && ! $this->accessService->canAssignDepartment($actor, $attributes['department_id'])
            ) {
                throw new PrivilegeEscalationException;
            }

            if (($attributes['is_active'] ?? null) === false) {
                $this->deactivateUser->execute($user, $actor);
                unset($attributes['is_active']);
            }

            $user->forceFill($attributes);
            $changes = $user->getDirty();
            $original = $user->getRawOriginal();
            $user->save();

            $this->recordChanges($user, $changes, $original, $actor);
        });

        return $user;
    }

    /**
     * @param  array<string, mixed>  $changes
     * @param  array<string, mixed>  $original
     */
    private function recordChanges(User $user, array $changes, array $original, User $actor): void
    {
        if (array_key_exists('department_id', $changes)) {
            $this->auditLogger->record('user.department_changed', $user, [
                'old' => $original['department_id'],
                'new' => $changes['department_id'],
            ], $actor);

            unset($changes['department_id']);
        }

        if ($changes !== []) {
            $this->auditLogger->record('user.updated', $user, [
                'old' => Arr::only($original, array_keys($changes)),
                'new' => $changes,
            ], $actor);
        }
    }
}
