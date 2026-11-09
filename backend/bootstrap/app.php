<?php

declare(strict_types=1);

use App\Core\Api\Exceptions\ApiException;
use App\Core\Api\Exceptions\ApiExceptionRenderer;
use App\Core\Logging\AssignRequestId;
use App\Core\Routing\ModuleRoutes;
use App\Modules\UserManagement\Console\CreateSuperAdminCommand;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Spatie\Permission\Middleware\PermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            ModuleRoutes::loadFrom(app_path('Core'));
            ModuleRoutes::loadFrom(app_path('Modules'));
        },
    )
    ->withCommands([CreateSuperAdminCommand::class])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(AssignRequestId::class);
        $middleware->statefulApi();
        $middleware->throttleApi();
        $middleware->redirectGuestsTo('/login');
        $middleware->alias(['permission' => PermissionMiddleware::class]);
        $middleware->prependToPriorityList(SubstituteBindings::class, PermissionMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport(ApiException::class);
        $exceptions->render(new ApiExceptionRenderer);
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
