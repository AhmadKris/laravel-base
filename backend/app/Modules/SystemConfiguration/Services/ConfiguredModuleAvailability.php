<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Services;

use App\Core\Modules\ModuleCatalog;
use App\Core\Modules\ModuleDefinition;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Shared\Contracts\ModuleAvailability;

final readonly class ConfiguredModuleAvailability implements ModuleAvailability
{
    public function __construct(private ModuleCatalog $catalog) {}

    public function isEnabled(string $module): bool
    {
        return ! in_array($module, $this->disabledModules(), true);
    }

    public function enabledModules(): array
    {
        $keys = array_map(fn (ModuleDefinition $module): string => $module->key, $this->catalog->modules());

        return array_values(array_diff($keys, $this->disabledModules()));
    }

    /**
     * Only optional modules count, whatever the stored list holds.
     *
     * @return list<string>
     */
    private function disabledModules(): array
    {
        $stored = SystemConfiguration::storedValue(SystemConfiguration::DISABLED_MODULES);

        return array_values(array_intersect($this->catalog->optionalModuleKeys(), is_array($stored) ? $stored : []));
    }
}
