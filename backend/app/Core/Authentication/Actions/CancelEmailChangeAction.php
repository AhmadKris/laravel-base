<?php

declare(strict_types=1);

namespace App\Core\Authentication\Actions;

use App\Modules\UserManagement\Models\User;

final class CancelEmailChangeAction
{
    public function execute(User $user): User
    {
        $user->forceFill(['pending_email' => null, 'pending_email_token' => null, 'pending_email_expires_at' => null])->save();

        return $user;
    }
}
