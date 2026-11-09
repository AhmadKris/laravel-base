<?php

declare(strict_types=1);

use App\Modules\Department\Controllers\DepartmentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('departments')->controller(DepartmentController::class)->group(function () {
    Route::get('/', 'index')->middleware('permission:department.view');
    Route::post('/', 'store')->middleware('permission:department.create');
    Route::get('{department}', 'show')->middleware('permission:department.view');
    Route::patch('{department}', 'update')->middleware('permission:department.update');
    Route::delete('{department}', 'destroy')->middleware('permission:department.delete');
    Route::get('{department}/users', 'users')->middleware('permission:user.view');
});
