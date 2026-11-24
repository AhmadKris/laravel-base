<?php

declare(strict_types=1);

namespace App\Core\Security;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

final class RateLimits
{
    public static function register(): void
    {
        $fieldAndIp = fn (Request $request, string $field): string => Str::lower($request->string($field)->toString()).'|'.$request->ip();

        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(5)->by($fieldAndIp($request, 'identifier')));

        RateLimiter::for('password-reset', fn (Request $request): Limit => Limit::perMinute(5)->by($fieldAndIp($request, 'email')));

        RateLimiter::for('password-change', fn (Request $request): Limit => Limit::perMinute(5)
            ->by((string) $request->user()?->getAuthIdentifier()));

        // Each request sends two emails, so it is limited like a password change.
        RateLimiter::for('email-change', fn (Request $request): Limit => Limit::perMinute(5)
            ->by((string) $request->user()?->getAuthIdentifier()));

        RateLimiter::for('email-change-confirm', fn (Request $request): Limit => Limit::perMinute(10)->by((string) $request->ip()));

        RateLimiter::for('uploads', fn (Request $request): Limit => Limit::perMinute(20)
            ->by((string) $request->user()?->getAuthIdentifier()));

        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(120)
            ->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip())));
    }
}
