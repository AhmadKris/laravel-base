<?php

declare(strict_types=1);

namespace App\Providers;

use App\Core\Authorization\Permissions\PermissionCatalog;
use App\Core\Modules\ModuleCatalog;
use App\Core\Security\RateLimits;
use App\Modules\SystemConfiguration\Services\ConfiguredModuleAvailability;
use App\Modules\UserManagement\Models\User;
use App\Shared\Contracts\ModuleAvailability;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PermissionCatalog::class, fn (): PermissionCatalog => PermissionCatalog::fromFiles([
            ...glob(app_path('Core/*/permissions.php')) ?: [],
            ...glob(app_path('Modules/*/permissions.php')) ?: [],
        ]));

        $this->app->singleton(ModuleCatalog::class, fn (): ModuleCatalog => ModuleCatalog::fromFiles([
            ...glob(app_path('Core/*/module.php')) ?: [],
            ...glob(app_path('Modules/*/module.php')) ?: [],
        ], config('navigation.sections')));

        $this->app->bind(ModuleAvailability::class, ConfiguredModuleAvailability::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimits::register();

        Password::defaults(fn (): Password => Password::min(12)->uncompromised());

        // The token stays in the URL fragment so it never reaches server or proxy logs.
        ResetPassword::createUrlUsing(fn (User $user, string $token): string => config('app.url').'/reset-password#'.http_build_query([
            'token' => $token,
            'email' => $user->email,
        ]));
    }
}
