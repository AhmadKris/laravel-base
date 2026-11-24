<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Modules\ModuleCatalog;
use App\Core\Modules\ModuleDefinition;
use App\Modules\SystemConfiguration\Actions\UpdateConfigurationAction;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\SystemConfiguration\Requests\UpdateModulesRequest;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;

final class ModuleController
{
    public function index(ModuleCatalog $catalog): JsonResponse
    {
        $configuration = SystemConfiguration::managed(SystemConfiguration::DISABLED_MODULES);

        return ApiResponse::success($this->modules($catalog, $configuration), 'Modules retrieved successfully');
    }

    public function update(UpdateModulesRequest $request, ModuleCatalog $catalog, UpdateConfigurationAction $action): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $configuration = SystemConfiguration::managed(SystemConfiguration::DISABLED_MODULES);

        $action->execute($configuration, $request->disabledModules(), $request->integer('version'), $actor);

        return ApiResponse::success($this->modules($catalog, $configuration), 'Modules updated successfully');
    }

    /**
     * @return array{modules: list<array{key: string, label: string, description: string, is_core: bool, enabled: bool}>, version: int}
     */
    private function modules(ModuleCatalog $catalog, SystemConfiguration $configuration): array
    {
        $disabled = is_array($configuration->value) ? $configuration->value : [];

        return [
            'modules' => array_map(fn (ModuleDefinition $module): array => [
                'key' => $module->key,
                'label' => $module->label,
                'description' => $module->description,
                'is_core' => $module->isCore,
                'enabled' => $module->isCore || ! in_array($module->key, $disabled, true),
            ], $catalog->modules()),
            'version' => $configuration->version,
        ];
    }
}
