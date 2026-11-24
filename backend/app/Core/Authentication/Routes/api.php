<?php

declare(strict_types=1);

use App\Core\Authentication\Controllers\AuthController;
use App\Core\Authentication\Controllers\EmailChangeController;
use App\Core\Authentication\Controllers\SessionController;
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

Route::middleware('auth:sanctum')->prefix('auth/sessions')->controller(SessionController::class)->group(function () {
    Route::get('/', 'index');
    Route::delete('/', 'destroyOthers');
    Route::delete('{session}', 'destroy');
});

Route::controller(EmailChangeController::class)->group(function () {
    Route::middleware(['auth:sanctum', 'throttle:email-change'])->group(function () {
        Route::post('account/email', 'store');
        Route::delete('account/email', 'destroy');
    });

    Route::post('auth/email-change/confirm', 'confirm')->middleware('throttle:email-change-confirm');
});
