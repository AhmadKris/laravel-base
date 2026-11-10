<?php

declare(strict_types=1);

namespace App\Modules\Notification\Listeners;

use App\Core\Authentication\Events\PasswordChanged;
use App\Core\Authentication\Events\PasswordReset;
use App\Modules\Notification\Notifications\PasswordChangedNotification;
use App\Modules\Notification\Notifications\PasswordResetNotification;
use App\Modules\Notification\Notifications\UserRolesUpdatedNotification;
use App\Modules\UserManagement\Events\UserRolesChanged;
use Illuminate\Events\Dispatcher;

final class AccountNotificationSubscriber
{
    public function handlePasswordChanged(PasswordChanged $event): void
    {
        $event->user->notify(new PasswordChangedNotification);
    }

    public function handlePasswordReset(PasswordReset $event): void
    {
        $event->user->notify(new PasswordResetNotification);
    }

    public function handleUserRolesChanged(UserRolesChanged $event): void
    {
        $event->user->notify(new UserRolesUpdatedNotification($event->roles));
    }

    /**
     * @return array<class-string, string>
     */
    public function subscribe(Dispatcher $events): array
    {
        return [
            PasswordChanged::class => 'handlePasswordChanged',
            PasswordReset::class => 'handlePasswordReset',
            UserRolesChanged::class => 'handleUserRolesChanged',
        ];
    }
}
