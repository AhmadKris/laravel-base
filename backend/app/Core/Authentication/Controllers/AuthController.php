<?php

declare(strict_types=1);

namespace App\Core\Authentication\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Authentication\Actions\ChangePasswordAction;
use App\Core\Authentication\Actions\LoginAction;
use App\Core\Authentication\Actions\LogoutAction;
use App\Core\Authentication\Actions\ResetPasswordAction;
use App\Core\Authentication\Actions\SendPasswordResetLinkAction;
use App\Core\Authentication\Requests\ChangePasswordRequest;
use App\Core\Authentication\Requests\ForgotPasswordRequest;
use App\Core\Authentication\Requests\LoginRequest;
use App\Core\Authentication\Requests\ResetPasswordRequest;
use App\Core\Authentication\Resources\AuthenticatedUserResource;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class AuthController
{
    public function login(LoginRequest $request, LoginAction $action): JsonResponse
    {
        $user = $action->execute(
            $request->validated('email'),
            $request->validated('password'),
            $request->session(),
        );

        return ApiResponse::success(new AuthenticatedUserResource($user), 'Logged in successfully');
    }

    public function logout(Request $request, LogoutAction $action): Response
    {
        /** @var User $user */
        $user = $request->user();

        $action->execute($user, $request->session());

        return response()->noContent();
    }

    public function user(Request $request): JsonResponse
    {
        return ApiResponse::success(new AuthenticatedUserResource($request->user()), 'Authenticated user');
    }

    public function forgotPassword(ForgotPasswordRequest $request, SendPasswordResetLinkAction $action): JsonResponse
    {
        $action->execute($request->validated('email'));

        return ApiResponse::success(message: 'If the email is registered, a password reset link has been sent.');
    }

    public function resetPassword(ResetPasswordRequest $request, ResetPasswordAction $action): JsonResponse
    {
        $action->execute(
            $request->validated('email'),
            $request->validated('token'),
            $request->validated('password'),
        );

        return ApiResponse::success(message: 'Password has been reset.');
    }

    public function changePassword(ChangePasswordRequest $request, ChangePasswordAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $action->execute($user, $request->validated('password'), $request->session());

        return ApiResponse::success(message: 'Password has been changed.');
    }
}
