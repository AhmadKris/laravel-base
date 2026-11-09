<?php

declare(strict_types=1);

use App\Modules\SystemConfiguration\Controllers\SystemConfigurationController;
use Illuminate\Support\Facades\Route;

Route::prefix('system-configurations')->controller(SystemConfigurationController::class)->group(function () {
    Route::get('public', 'public');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('feature-flags', 'featureFlags')->middleware('permission:system_config.feature_flags');
        Route::get('/', 'index')->middleware('permission:system_config.view');
        Route::get('{configuration}', 'show')->middleware('permission:system_config.view');
        Route::patch('{configuration}', 'update')->middleware('permission:system_config.update');
    });
});
