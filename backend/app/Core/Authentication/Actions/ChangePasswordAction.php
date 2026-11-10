<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Events\PasswordChanged;
use App\Core\Authentication\Services\SessionService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ChangePasswordAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly SessionService $sessionService,
    ) {}

    public function execute(User $user, string $password, Session $session): void
    {
        DB::transaction(function () use ($user, $password, $session): void {
            $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();

            $session->regenerate();

            $this->sessionService->endOthers($user, $session->getId());
            $this->auditLogger->record('auth.password_changed', $user, actor: $user);
        });

        DB::afterCommit(static fn () => PasswordChanged::dispatch($user));
    }
}
