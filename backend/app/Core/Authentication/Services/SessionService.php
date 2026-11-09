<?php

declare(strict_types=1);

namespace App\Core\Authentication\Services;

use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\DB;

final class SessionService
{
    public function endAll(User $user): void
    {
        DB::table('sessions')->where('user_id', $user->getKey())->delete();
    }

    public function endOthers(User $user, string $currentSessionId): void
    {
        DB::table('sessions')
            ->where('user_id', $user->getKey())
            ->where('id', '!=', $currentSessionId)
            ->delete();
    }
}
