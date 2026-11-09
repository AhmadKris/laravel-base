<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Exceptions\InvalidPasswordResetException;
use App\Core\Authentication\Services\SessionService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

final class ResetPasswordAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly SessionService $sessionService,
    ) {}

    /**
     * @throws InvalidPasswordResetException
     */
    public function execute(string $email, string $token, string $password): void
    {
        $status = Password::reset(
            ['email' => User::normalizeIdentifier($email), 'token' => $token, 'password' => $password, 'is_active' => true],
            function (User $user, string $password): void {
                DB::transaction(function () use ($user, $password): void {
                    $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();

                    $this->sessionService->endAll($user);
                    $this->auditLogger->record('auth.password_reset', $user, actor: $user);
                });
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw new InvalidPasswordResetException;
        }
    }
}
