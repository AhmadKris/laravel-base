<?php

declare(strict_types=1);

namespace App\Core\Audit\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Audit\AuditLogQuery;
use App\Core\Audit\Requests\AuditLogListRequest;
use App\Core\Audit\Resources\AuditLogResource;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AuditLogController
{
    public function __construct(private readonly AuditLogQuery $logs) {}

    public function index(AuditLogListRequest $request): JsonResponse
    {
        $logs = $request->applyFilters($this->logs->visibleTo($this->viewer($request)))->paginate($request->perPage());

        return ApiResponse::paginated($logs, AuditLogResource::class, 'Audit logs retrieved successfully');
    }

    public function show(Request $request, string $auditLog): JsonResponse
    {
        return ApiResponse::success(
            new AuditLogResource($this->logs->visibleTo($this->viewer($request))->findOrFail($auditLog)),
            'Audit log retrieved successfully',
        );
    }

    private function viewer(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}
