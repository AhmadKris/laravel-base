<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Services\SessionService;
use App\Core\Authorization\Models\Role;
use App\Modules\UserManagement\Exceptions\LastSuperAdminException;
use App\Modules\UserManagement\Exceptions\UserSelfDeactivationException;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class DeactivateUserAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly SessionService $sessionService,
    ) {}

    /**
     * @throws UserSelfDeactivationException
     * @throws LastSuperAdminException
     */
    public function execute(User $user, User $actor): void
    {
        if ($user->is($actor)) {
            throw new UserSelfDeactivationException;
        }

        if (! $user->is_active) {
            return;
        }

        DB::transaction(function () use ($user, $actor): void {
            $activeSuperAdmins = User::role(Role::SUPER_ADMIN)
                ->where('is_active', true)
                ->lockForUpdate()
                ->pluck('id');

            if ($activeSuperAdmins->count() === 1 && $activeSuperAdmins->contains($user->id)) {
                throw new LastSuperAdminException;
            }

            // Without a new token, a remember cookie would sign the deactivated user back in.
            $user->forceFill(['is_active' => false, 'remember_token' => Str::random(60)])->save();

            $this->sessionService->endAll($user);
            $this->auditLogger->record('user.deactivated', $user, actor: $actor);
        });
    }
}
