<?php

declare(strict_types=1);

namespace App\Core\Routing;

use Illuminate\Support\Facades\Route;

final class ModuleRoutes
{
    public static function loadFrom(string $modulesPath): void
    {
        foreach (glob($modulesPath.'/*/Routes/api.php') ?: [] as $routeFile) {
            Route::middleware('api')->prefix('api/v1')->group($routeFile);
        }
    }
}
