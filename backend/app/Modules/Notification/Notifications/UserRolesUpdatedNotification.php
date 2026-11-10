<?php

declare(strict_types=1);

namespace App\Modules\Notification\Notifications;

use App\Modules\Notification\Enums\NotificationCategory;

final class UserRolesUpdatedNotification extends InAppNotification
{
    /**
     * @param  list<string>  $roles
     */
    public function __construct(private readonly array $roles) {}

    protected function category(): NotificationCategory
    {
        return NotificationCategory::User;
    }

    protected function type(): string
    {
        return 'user.roles_updated';
    }

    protected function title(): string
    {
        return 'Role akun diperbarui';
    }

    protected function message(): string
    {
        return $this->roles === []
            ? 'Semua role pada akun Anda telah dicabut oleh administrator.'
            : 'Role akun Anda diperbarui oleh administrator. Role saat ini: '.implode(', ', $this->roles).'.';
    }

    protected function actionUrl(): string
    {
        return '/';
    }
}
