<?php

declare(strict_types=1);

namespace App\Modules\Notification\Notifications;

use App\Modules\Notification\Enums\NotificationCategory;

final class PasswordChangedNotification extends InAppNotification
{
    protected function category(): NotificationCategory
    {
        return NotificationCategory::Security;
    }

    protected function type(): string
    {
        return 'security.password_changed';
    }

    protected function title(): string
    {
        return 'Password akun diubah';
    }

    protected function message(): string
    {
        return 'Password akun Anda baru saja diubah. Jika Anda tidak melakukan perubahan ini, segera hubungi administrator.';
    }

    protected function actionUrl(): string
    {
        return '/change-password';
    }
}
