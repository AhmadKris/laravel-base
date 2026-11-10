<?php

declare(strict_types=1);

namespace App\Core\Authentication\Events;

use App\Modules\UserManagement\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class PasswordChanged
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public readonly User $user) {}
}
