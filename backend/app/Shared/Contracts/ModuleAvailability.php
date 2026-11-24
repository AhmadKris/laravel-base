<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Whether a module may be used. Optional modules check it before creating data, and their
 * routes are guarded by the "module" middleware.
 */
interface ModuleAvailability
{
    public function isEnabled(string $module): bool;

    /**
     * @return list<string>
     */
    public function enabledModules(): array;
}
