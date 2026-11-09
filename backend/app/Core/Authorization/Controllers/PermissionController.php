<?php

declare(strict_types=1);

namespace App\Core\Authorization\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Authorization\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

final class PermissionController
{
    public function index(): JsonResponse
    {
        return ApiResponse::success(
            PermissionResource::collection(Permission::query()->orderBy('name')->get()),
            'Permissions retrieved successfully',
        );
    }
}
