<?php

declare(strict_types=1);

namespace App\Core\Authentication\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Authentication\Actions\CancelEmailChangeAction;
use App\Core\Authentication\Actions\ConfirmEmailChangeAction;
use App\Core\Authentication\Actions\RequestEmailChangeAction;
use App\Core\Authentication\Requests\ConfirmEmailChangeRequest;
use App\Core\Authentication\Requests\RequestEmailChangeRequest;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class EmailChangeController
{
    public function store(RequestEmailChangeRequest $request, RequestEmailChangeAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user = $action->execute($user, $request->validated('email'));

        return ApiResponse::success([
            'email' => $user->pending_email,
            'expires_at' => $user->pending_email_expires_at,
        ], 'Confirmation link sent to the new email');
    }

    public function destroy(Request $request, CancelEmailChangeAction $action): Response
    {
        /** @var User $user */
        $user = $request->user();

        $action->execute($user);

        return response()->noContent();
    }

    /**
     * Public, because the link may be opened on a device where the user is not signed in.
     * The token proves the request comes from the new mailbox.
     */
    public function confirm(ConfirmEmailChangeRequest $request, ConfirmEmailChangeAction $action): JsonResponse
    {
        $action->execute($request->validated('id'), $request->validated('token'));

        return ApiResponse::success(message: 'Email has been changed.');
    }
}
