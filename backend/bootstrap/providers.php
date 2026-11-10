<?php

declare(strict_types=1);

use App\Modules\Notification\Providers\NotificationServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    NotificationServiceProvider::class,
];
