<?php

declare(strict_types=1);

namespace App\Core\Authorization\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Authorization\Actions\AssignRolePermissionsAction;
use App\Core\Authorization\Actions\CreateRoleAction;
use App\Core\Authorization\Actions\DeleteRoleAction;
use App\Core\Authorization\Actions\UpdateRoleAction;
use App\Core\Authorization\Models\Role;
use App\Core\Authorization\Requests\AssignRolePermissionsRequest;
use App\Core\Authorization\Requests\RoleListRequest;
use App\Core\Authorization\Requests\StoreRoleRequest;
use App\Core\Authorization\Requests\UpdateRoleRequest;
use App\Core\Authorization\Resources\PermissionResource;
use App\Core\Authorization\Resources\RoleResource;
use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class RoleController
{
    public function index(RoleListRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Role::class);

        $roles = $request->applySorting(Role::query()->withCount('users'))
            ->when(
                $request->validated('search'),
                fn (Builder $query, string $search) => $query->where('name', 'like', "%{$search}%"),
            )
            ->orderBy('id')
            ->paginate($request->perPage());

        return ApiResponse::paginated($roles, RoleResource::class, 'Roles retrieved successfully');
    }

    public function store(StoreRoleRequest $request, CreateRoleAction $action): JsonResponse
    {
        Gate::authorize('create', Role::class);

        $role = $action->execute($request->validated('name'), $this->actor($request));

        return ApiResponse::success(new RoleResource($role->refresh()), 'Role created successfully', 201);
    }

    public function show(Role $role): JsonResponse
    {
        Gate::authorize('view', $role);

        return ApiResponse::success(new RoleResource($role->loadCount('users')), 'Role retrieved successfully');
    }

    public function update(UpdateRoleRequest $request, Role $role, UpdateRoleAction $action): JsonResponse
    {
        Gate::authorize('update', $role);

        $action->execute($role, $request->validated('name'), $this->actor($request));

        return ApiResponse::success(new RoleResource($role), 'Role updated successfully');
    }

    public function destroy(Request $request, Role $role, DeleteRoleAction $action): Response
    {
        Gate::authorize('delete', $role);

        $action->execute($role, $this->actor($request));

        return response()->noContent();
    }

    public function permissions(Role $role): JsonResponse
    {
        Gate::authorize('view', $role);

        return ApiResponse::success(
            PermissionResource::collection($role->permissions()->orderBy('name')->get()),
            'Role permissions retrieved successfully',
        );
    }

    public function assignPermissions(
        AssignRolePermissionsRequest $request,
        Role $role,
        AssignRolePermissionsAction $action,
    ): JsonResponse {
        Gate::authorize('assignPermissions', $role);

        $action->execute(
            $role,
            $request->validated('permissions'),
            $request->validated('version'),
            $this->actor($request),
        );

        return ApiResponse::success(new RoleResource($role), 'Role permissions updated successfully');
    }

    private function actor(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}
