<?php

declare(strict_types=1);

namespace App\Core\Authentication\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Core\Authentication\Actions\RevokeOtherSessionsAction;
use App\Core\Authentication\Actions\RevokeSessionAction;
use App\Core\Authentication\Services\SessionService;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class SessionController
{
    /**
     * A user has only a handful of sessions, so the list is not paginated.
     */
    public function index(Request $request, SessionService $sessions): JsonResponse
    {
        return ApiResponse::success(
            $sessions->forUser($this->user($request), $request->session()->getId()),
            'Sessions retrieved successfully',
        );
    }

    public function destroy(Request $request, string $session, RevokeSessionAction $action): Response
    {
        $action->execute($this->user($request), $session, $request->session()->getId());

        return response()->noContent();
    }

    /**
     * Ends every session except the one making the request.
     */
    public function destroyOthers(Request $request, RevokeOtherSessionsAction $action): JsonResponse
    {
        $ended = $action->execute($this->user($request), $request->session()->getId());

        return ApiResponse::success(['ended' => $ended], 'Other sessions ended');
    }

    private function user(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}
