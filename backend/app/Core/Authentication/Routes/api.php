<?php

declare(strict_types=1);

use App\Core\Authentication\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::middleware('throttle:password-reset')->group(function () {
        Route::post('forgot-password', 'forgotPassword');
        Route::post('reset-password', 'resetPassword');
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('user', 'user');
        Route::post('change-password', 'changePassword')->middleware('throttle:password-change');
    });
});
