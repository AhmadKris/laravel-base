<?php

declare(strict_types=1);

namespace App\Core\Authorization\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Authorization\Permissions\PermissionCatalog;
use App\Core\Authorization\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

final class PermissionController
{
    public function index(PermissionCatalog $catalog): JsonResponse
    {
        // Only catalog permissions are offered; one left behind by a removed module is not.
        $permissions = Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $catalog->names())
            ->get()
            ->sortBy(fn (Permission $permission): int => $catalog->position($permission->name))
            ->values();

        return ApiResponse::success(PermissionResource::collection($permissions), 'Permissions retrieved successfully');
    }
}
