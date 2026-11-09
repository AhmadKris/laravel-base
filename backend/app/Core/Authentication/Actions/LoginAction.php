<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Core\Authentication\Exceptions\InvalidCredentialsException;
use App\Modules\UserManagement\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Auth;

final class LoginAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws InvalidCredentialsException
     */
    public function execute(string $identifier, string $password, bool $remember, Session $session): User
    {
        $guard = Auth::guard('web');

        $normalized = User::normalizeIdentifier($identifier);
        $identifierColumn = str_contains($normalized, '@') ? 'email' : 'username';

        if (! $guard->attempt([$identifierColumn => $normalized, 'password' => $password, 'is_active' => true], $remember)) {
            $this->auditLogger->record('auth.login_failed', properties: ['identifier' => $identifier]);

            throw new InvalidCredentialsException;
        }

        $session->regenerate();

        /** @var User $user */
        $user = $guard->user();
        $user->forceFill(['last_login_at' => now()])->save();

        $this->auditLogger->record('auth.login', $user, actor: $user);

        return $user;
    }
}
