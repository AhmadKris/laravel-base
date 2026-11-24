<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Exceptions\CurrentSessionException;
use App\Core\Authentication\Services\SessionService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class RevokeSessionAction
{
    public function __construct(
        private AuditLogger $auditLogger,
        private SessionService $sessions,
    ) {}

    /**
     * Rotating the remember token stops the revoked device from signing in again with its
     * "remember me" cookie. Other devices stay signed in until their session ends.
     *
     * @throws CurrentSessionException
     */
    public function execute(User $user, string $publicId, string $currentSessionId): void
    {
        if (hash_equals(SessionService::publicId($currentSessionId), $publicId)) {
            throw new CurrentSessionException;
        }

        $sessionId = $this->sessions->find($user, $publicId) ?? throw new NotFoundHttpException;

        DB::transaction(function () use ($user, $sessionId): void {
            $this->sessions->end($sessionId);
            $user->forceFill(['remember_token' => Str::random(60)])->save();
            $this->auditLogger->record('auth.session_revoked', $user, actor: $user);
        });
    }
}
