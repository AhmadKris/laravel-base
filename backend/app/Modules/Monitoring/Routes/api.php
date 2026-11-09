<?php

declare(strict_types=1);

use App\Modules\Monitoring\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class);
