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
        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(5)
            ->by(Str::lower($request->string('email')->toString()).'|'.$request->ip()));

        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(120)
            ->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip())));
    }
}
