<?php

declare(strict_types=1);

namespace App\Modules\Notification\Controllers;

use App\Core\Api\Responses\ApiResponse;
use App\Modules\Notification\Actions\MarkAllNotificationsAsReadAction;
use App\Modules\Notification\Actions\MarkNotificationAsReadAction;
use App\Modules\Notification\Models\Notification;
use App\Modules\Notification\Requests\NotificationListRequest;
use App\Modules\Notification\Resources\NotificationResource;
use App\Modules\UserManagement\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class NotificationController
{
    public function index(NotificationListRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Notification::class);

        $notifications = $request->applyFilters(Notification::query()->visibleTo($this->actor($request)))
            ->paginate($request->perPage());

        return ApiResponse::paginated($notifications, NotificationResource::class, 'Notifications retrieved successfully');
    }

    public function unreadCount(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Notification::class);

        $count = Notification::query()
            ->visibleTo($this->actor($request))
            ->whereNull('read_at')
            ->count();

        return ApiResponse::success(['unread_count' => $count], 'Unread notification count retrieved successfully');
    }

    public function markAsRead(Notification $notification, MarkNotificationAsReadAction $action): JsonResponse
    {
        Gate::authorize('markAsRead', $notification);

        $updated = $action->execute($notification);

        return ApiResponse::success(new NotificationResource($updated), 'Notification marked as read');
    }

    public function markAllAsRead(Request $request, MarkAllNotificationsAsReadAction $action): JsonResponse
    {
        Gate::authorize('markAllAsRead', Notification::class);

        $markedCount = $action->execute($this->actor($request));

        return ApiResponse::success(
            ['unread_count' => 0, 'marked_count' => $markedCount],
            'All notifications marked as read',
        );
    }

    private function actor(Request $request): User
    {
        /** @var User */
        return $request->user();
    }
}
