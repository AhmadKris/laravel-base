<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authorization\Exceptions\PrivilegeEscalationException;
use App\Modules\Department\Services\DepartmentAccessService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateUserAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly DepartmentAccessService $accessService,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws PrivilegeEscalationException
     */
    public function execute(array $attributes, User $actor): User
    {
        if (! $this->accessService->canAssignDepartment($actor, $attributes['department_id'] ?? null)) {
            throw new PrivilegeEscalationException;
        }

        return DB::transaction(function () use ($attributes, $actor): User {
            $user = new User;
            $user->forceFill([...$attributes, 'email_verified_at' => now()])->save();

            $this->auditLogger->record('user.created', $user, ['email' => $user->email], $actor);

            return $user;
        });
    }
}
