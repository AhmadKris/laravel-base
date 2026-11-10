<?php

declare(strict_types=1);

namespace App\Modules\Notification\Notifications;

use App\Modules\Notification\Enums\NotificationCategory;

final class PasswordResetNotification extends InAppNotification
{
    protected function category(): NotificationCategory
    {
        return NotificationCategory::Security;
    }

    protected function type(): string
    {
        return 'security.password_reset';
    }

    protected function title(): string
    {
        return 'Password akun direset';
    }

    protected function message(): string
    {
        return 'Password akun Anda baru saja direset. Jika Anda tidak merasa melakukan reset, segera hubungi administrator.';
    }

    protected function actionUrl(): string
    {
        return '/change-password';
    }
}
