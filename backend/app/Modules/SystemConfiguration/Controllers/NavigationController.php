<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Modules\SystemConfiguration\Actions\UpdateConfigurationAction;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\SystemConfiguration\Requests\UpdateNavigationLayoutRequest;
use App\Modules\SystemConfiguration\Services\NavigationLayout;
use App\Modules\UserManagement\Models\User;
use App\Shared\Contracts\ModuleAvailability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NavigationController
{
    public function index(Request $request, NavigationLayout $layout, ModuleAvailability $modules): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return ApiResponse::success([
            'sections' => $layout->forUser($user, SystemConfiguration::storedValue(SystemConfiguration::NAVIGATION_LAYOUT)),
            'modules' => $modules->enabledModules(),
        ], 'Navigation retrieved successfully');
    }

    public function layout(NavigationLayout $layout): JsonResponse
    {
        $configuration = SystemConfiguration::managed(SystemConfiguration::NAVIGATION_LAYOUT);

        return ApiResponse::success($layout->editor($configuration->value, $configuration->version), 'Navigation layout retrieved successfully');
    }

    public function updateLayout(
        UpdateNavigationLayoutRequest $request,
        NavigationLayout $layout,
        UpdateConfigurationAction $action,
    ): JsonResponse {
        /** @var User $actor */
        $actor = $request->user();
        $configuration = SystemConfiguration::managed(SystemConfiguration::NAVIGATION_LAYOUT);

        $action->execute($configuration, $request->validated('sections'), $request->integer('version'), $actor);

        return ApiResponse::success($layout->editor($configuration->value, $configuration->version), 'Navigation layout updated successfully');
    }
}
