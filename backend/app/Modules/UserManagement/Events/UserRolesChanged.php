<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Events;

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class UserRolesChanged
{
    use Dispatchable;
    use SerializesModels;

    /**
     * @param  list<string>  $roles
     */
    public function __construct(
        public readonly User $user,
        public readonly array $roles,
    ) {}
}
