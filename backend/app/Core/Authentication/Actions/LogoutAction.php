<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Core\Audit\AuditLogger;
use App\Modules\UserManagement\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Auth;

final class LogoutAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function execute(User $user, Session $session): void
    {
        Auth::guard('web')->logout();

        $session->invalidate();
        $session->regenerateToken();

        $this->auditLogger->record('auth.logout', $user, actor: $user);
    }
}
