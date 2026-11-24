<?php

declare(strict_types=1);

namespace App\Core\Modules;

use App\Core\Modules\Exceptions\ModuleDisabledException;
use App\Shared\Contracts\ModuleAvailability;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class EnsureModuleEnabled
{
    public function __construct(private ModuleAvailability $modules) {}

    /**
     * @param  Closure(Request): Response  $next
     *
     * @throws ModuleDisabledException
     */
    public function handle(Request $request, Closure $next, string $module): Response
    {
        if (! $this->modules->isEnabled($module)) {
            throw new ModuleDisabledException;
        }

        return $next($request);
    }
}
