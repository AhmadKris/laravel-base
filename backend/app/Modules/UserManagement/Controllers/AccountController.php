<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Modules\UserManagement\Actions\RemoveAvatarAction;
use App\Modules\UserManagement\Actions\UpdateAccountAction;
use App\Modules\UserManagement\Actions\UpdateAvatarAction;
use App\Modules\UserManagement\Models\User;
use App\Modules\UserManagement\Requests\UpdateAccountRequest;
use App\Modules\UserManagement\Requests\UploadAvatarRequest;
use App\Modules\UserManagement\Resources\AccountResource;
use App\Modules\UserManagement\Services\AvatarStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Every endpoint works on the signed-in user, so no permission or policy beyond login applies.
 */
final class AccountController
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success(new AccountResource($this->user($request)), 'Account retrieved successfully');
    }

    public function update(UpdateAccountRequest $request, UpdateAccountAction $action): JsonResponse
    {
        /** @var array{name?: string, phone?: string|null} $attributes */
        $attributes = $request->validated();

        $user = $action->execute($this->user($request), $attributes);

        return ApiResponse::success(new AccountResource($user), 'Account updated successfully');
    }

    public function avatar(Request $request, AvatarStorage $storage): StreamedResponse
    {
        return $storage->response($this->user($request));
    }

    public function storeAvatar(UploadAvatarRequest $request, UpdateAvatarAction $action): JsonResponse
    {
        /** @var UploadedFile $file */
        $file = $request->validated('file');

        $user = $action->execute($this->user($request), $file);

        return ApiResponse::success(new AccountResource($user), 'Profile photo updated successfully');
    }

    public function destroyAvatar(Request $request, RemoveAvatarAction $action): JsonResponse
    {
        $user = $this->user($request);
        $action->execute($user);

        return ApiResponse::success(new AccountResource($user), 'Profile photo removed successfully');
    }

    private function user(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}
