<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Modules\UserManagement\Actions\AssignUserRolesAction;
use App\Modules\UserManagement\Actions\CreateUserAction;
use App\Modules\UserManagement\Actions\DeactivateUserAction;
use App\Modules\UserManagement\Actions\UpdateUserAction;
use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Requests\AssignUserRolesRequest;
use App\Modules\UserManagement\Requests\StoreUserRequest;
use App\Modules\UserManagement\Requests\UpdateUserRequest;
use App\Modules\UserManagement\Requests\UserListRequest;
use App\Modules\UserManagement\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class UserController
{
    private const array DETAIL_RELATIONS = ['roles'];

    public function index(UserListRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        $users = $request->applyFilters(User::query()->with(self::DETAIL_RELATIONS)->visibleTo($this->actor($request)))
            ->paginate($request->perPage());

        return ApiResponse::paginated($users, UserResource::class, 'Users retrieved successfully');
    }

    public function store(StoreUserRequest $request, CreateUserAction $action): JsonResponse
    {
        Gate::authorize('create', User::class);

        if ($request->selectedRoles() !== null) {
            Gate::authorize('assignRolesOnCreate', User::class);
        }

        $user = $action->execute($request->attributesForModel(), $request->selectedRoles(), $this->actor($request));

        return ApiResponse::success($this->detail($user), 'User created successfully', 201);
    }

    public function show(User $user): JsonResponse
    {
        Gate::authorize('view', $user);

        return ApiResponse::success($this->detail($user), 'User retrieved successfully');
    }

    public function update(UpdateUserRequest $request, User $user, UpdateUserAction $action): JsonResponse
    {
        Gate::authorize('update', $user);

        if ($request->selectedRoles() !== null) {
            Gate::authorize('assignRoles', $user);
        }

        $action->execute($user, $request->attributesForModel(), $request->selectedRoles(), $this->actor($request));

        return ApiResponse::success($this->detail($user), 'User updated successfully');
    }

    public function destroy(Request $request, User $user, DeactivateUserAction $action): Response
    {
        Gate::authorize('delete', $user);

        $action->execute($user, $this->actor($request));

        return response()->noContent();
    }

    public function roles(User $user): JsonResponse
    {
        Gate::authorize('view', $user);

        return ApiResponse::success(['roles' => $user->getRoleNames()], 'User roles retrieved successfully');
    }

    public function assignRoles(AssignUserRolesRequest $request, User $user, AssignUserRolesAction $action): JsonResponse
    {
        Gate::authorize('assignRoles', $user);

        $action->execute($user, $request->validated('roles'), $this->actor($request));

        return ApiResponse::success($this->detail($user), 'User roles updated successfully');
    }

    private function detail(User $user): UserResource
    {
        return new UserResource($user->refresh()->load(self::DETAIL_RELATIONS));
    }

    private function actor(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}
