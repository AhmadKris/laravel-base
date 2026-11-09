<?php

declare(strict_types=1);

namespace App\Providers;

use App\Core\Security\RateLimits;
use App\Modules\UserManagement\Models\User;
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
        //
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
