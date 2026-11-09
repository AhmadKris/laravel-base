<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Modules\SystemConfiguration\Actions\UpdateConfigurationAction;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\SystemConfiguration\Requests\ConfigurationListRequest;
use App\Modules\SystemConfiguration\Requests\UpdateConfigurationRequest;
use App\Modules\SystemConfiguration\Resources\SystemConfigurationResource;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class SystemConfigurationController
{
    public function index(ConfigurationListRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', SystemConfiguration::class);

        /** @var User $actor */
        $actor = $request->user();

        $configurations = $request->applyFilters(SystemConfiguration::query()->visibleTo($actor))
            ->paginate($request->perPage());

        return ApiResponse::paginated(
            $configurations,
            SystemConfigurationResource::class,
            'Configurations retrieved successfully',
        );
    }

    public function show(SystemConfiguration $configuration): JsonResponse
    {
        Gate::authorize('view', $configuration);

        return ApiResponse::success(new SystemConfigurationResource($configuration), 'Configuration retrieved successfully');
    }

    public function update(
        UpdateConfigurationRequest $request,
        SystemConfiguration $configuration,
        UpdateConfigurationAction $action,
    ): JsonResponse {
        Gate::authorize('update', $configuration);

        /** @var User $actor */
        $actor = $request->user();

        $action->execute($configuration, $request->validated('value'), $request->validated('version'), $actor);

        return ApiResponse::success(new SystemConfigurationResource($configuration), 'Configuration updated successfully');
    }

    public function public(): JsonResponse
    {
        $configurations = SystemConfiguration::query()
            ->where('is_public', true)
            ->where('is_sensitive', false)
            ->orderBy('key')
            ->pluck('value', 'key');

        return ApiResponse::success($configurations->all(), 'Public configurations retrieved successfully');
    }

    public function featureFlags(): JsonResponse
    {
        $flags = SystemConfiguration::query()
            ->where('key', 'like', 'feature.%')
            ->where('is_sensitive', false)
            ->orderBy('key')
            ->get()
            ->map(fn (SystemConfiguration $flag): array => ['key' => $flag->key, 'enabled' => (bool) $flag->value]);

        return ApiResponse::success($flags->all(), 'Feature flags retrieved successfully');
    }
}
