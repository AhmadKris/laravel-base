<?php

declare(strict_types=1);

use App\Core\Audit\Controllers\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'permission:audit.view'])
    ->prefix('audit-logs')
    ->controller(AuditLogController::class)
    ->group(function () {
        Route::get('/', 'index');
        Route::get('{auditLog}', 'show')->whereNumber('auditLog');
    });
