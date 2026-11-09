<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use Illuminate\Support\Facades\Password;

use function Illuminate\Support\defer;

final class SendPasswordResetLinkAction
{
    public function execute(string $email): void
    {
        // Sending mail inside the request would reveal through timing whether the email is registered.
        // A queued job is not used because its payload would contain the reset token.
        defer(fn () => Password::sendResetLink(['email' => $email, 'is_active' => true]));
    }
}
