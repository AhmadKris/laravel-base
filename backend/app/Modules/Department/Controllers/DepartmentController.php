<?php

declare(strict_types=1);

namespace App\Modules\Department\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Modules\Department\Actions\CreateDepartmentAction;
use App\Modules\Department\Actions\DeleteDepartmentAction;
use App\Modules\Department\Actions\UpdateDepartmentAction;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Requests\DepartmentListRequest;
use App\Modules\Department\Requests\StoreDepartmentRequest;
use App\Modules\Department\Requests\UpdateDepartmentRequest;
use App\Modules\Department\Resources\DepartmentResource;
use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Requests\UserListRequest;
use App\Modules\UserManagement\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class DepartmentController
{
    public function index(DepartmentListRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Department::class);

        $departments = $request->applyFilters(Department::query()->with('parent')->visibleTo($this->actor($request)))
            ->paginate($request->perPage());

        return ApiResponse::paginated($departments, DepartmentResource::class, 'Departments retrieved successfully');
    }

    public function store(StoreDepartmentRequest $request, CreateDepartmentAction $action): JsonResponse
    {
        Gate::authorize('create', Department::class);

        $department = $action->execute($request->attributesForModel(), $this->actor($request));

        return ApiResponse::success(new DepartmentResource($department->refresh()), 'Department created successfully', 201);
    }

    public function show(Department $department): JsonResponse
    {
        Gate::authorize('view', $department);

        return ApiResponse::success(new DepartmentResource($department), 'Department retrieved successfully');
    }

    public function update(
        UpdateDepartmentRequest $request,
        Department $department,
        UpdateDepartmentAction $action,
    ): JsonResponse {
        Gate::authorize('update', $department);

        $action->execute($department, $request->attributesForModel(), $this->actor($request));

        return ApiResponse::success(new DepartmentResource($department->refresh()), 'Department updated successfully');
    }

    public function destroy(Request $request, Department $department, DeleteDepartmentAction $action): Response
    {
        Gate::authorize('delete', $department);

        $action->execute($department, $this->actor($request));

        return response()->noContent();
    }

    public function users(UserListRequest $request, Department $department): JsonResponse
    {
        Gate::authorize('viewUsers', $department);

        $users = $request->applyFilters(
            User::query()->visibleTo($this->actor($request))->whereBelongsTo($department),
        )->paginate($request->perPage());

        return ApiResponse::paginated($users, UserResource::class, 'Department users retrieved successfully');
    }

    private function actor(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}
