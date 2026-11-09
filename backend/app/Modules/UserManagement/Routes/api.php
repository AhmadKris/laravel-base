<?php

declare(strict_types=1);

use App\Modules\UserManagement\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('users')->controller(UserController::class)->group(function () {
    Route::get('/', 'index')->middleware('permission:user.view');
    Route::post('/', 'store')->middleware('permission:user.create');
    Route::get('{user}', 'show')->middleware('permission:user.view');
    Route::patch('{user}', 'update')->middleware('permission:user.update');
    Route::delete('{user}', 'destroy')->middleware('permission:user.delete');
    Route::get('{user}/roles', 'roles')->middleware('permission:user.view');
    Route::put('{user}/roles', 'assignRoles')->middleware('permission:user.assign_role');
});
