<?php

declare(strict_types=1);

namespace App\Core\Audit\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Audit\AuditLogger;
use App\Core\Audit\Requests\AuditLogListRequest;
use App\Core\Audit\Resources\AuditLogResource;
use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Http\JsonResponse;
use Spatie\Activitylog\Models\Activity;

final class AuditLogController
{
    public function index(AuditLogListRequest $request): JsonResponse
    {
        $logs = $request->applyFilters($this->query())->paginate($request->perPage());

        return ApiResponse::paginated($logs, AuditLogResource::class, 'Audit logs retrieved successfully');
    }

    public function show(string $auditLog): JsonResponse
    {
        return ApiResponse::success(
            new AuditLogResource($this->query()->findOrFail($auditLog)),
            'Audit log retrieved successfully',
        );
    }

    /**
     * @return Builder<Activity>
     */
    private function query(): Builder
    {
        $includeTrashed = fn (Builder $query) => $query->withoutGlobalScope(SoftDeletingScope::class);

        return Activity::query()->inLog(AuditLogger::LOG_NAME)->with([
            'causer' => fn (MorphTo $causer) => $causer->constrain([User::class => $includeTrashed]),
            'subject' => fn (MorphTo $subject) => $subject->constrain([
                User::class => $includeTrashed,
                Department::class => $includeTrashed,
            ]),
        ]);
    }
}
