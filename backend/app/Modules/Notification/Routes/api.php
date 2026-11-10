<?php

declare(strict_types=1);

use App\Modules\Notification\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')
    ->prefix('notifications')
    ->controller(NotificationController::class)
    ->group(function () {
        Route::get('/', 'index');
        Route::get('unread-count', 'unreadCount');
        Route::post('read-all', 'markAllAsRead');
        Route::patch('{notification}/read', 'markAsRead');
    });
