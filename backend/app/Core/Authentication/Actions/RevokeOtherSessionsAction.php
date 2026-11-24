<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Services\SessionService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class RevokeOtherSessionsAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private SessionService $sessions,
    ) {}

    /**
     * @return int The number of sessions ended.
     */
    public function execute(User $user, string $currentSessionId): int
    {
        return DB::transaction(function () use ($user, $currentSessionId): int {
            $ended = $this->sessions->endOthers($user, $currentSessionId);
            // Without a new remember token, a device with a "remember me" cookie would sign in again.
            $user->forceFill(['remember_token' => Str::random(60)])->save();
            $this->auditLogger->record('auth.other_sessions_revoked', $user, ['count' => $ended], $user);

            return $ended;
        });
    }
}
