<?php

declare(strict_types=1);

use App\Core\Authorization\Controllers\PermissionController;
use App\Core\Authorization\Controllers\RoleController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('permissions', [PermissionController::class, 'index'])->middleware('permission:permission.view');

    Route::prefix('roles')->controller(RoleController::class)->group(function () {
        Route::get('/', 'index')->middleware('permission:role.view');
        Route::post('/', 'store')->middleware('permission:role.create');
        Route::get('{role}', 'show')->middleware('permission:role.view');
        Route::patch('{role}', 'update')->middleware('permission:role.update');
        Route::delete('{role}', 'destroy')->middleware('permission:role.delete');
        Route::get('{role}/permissions', 'permissions')->middleware('permission:role.view');
        Route::put('{role}/permissions', 'assignPermissions')->middleware('permission:permission.assign');
    });
});
