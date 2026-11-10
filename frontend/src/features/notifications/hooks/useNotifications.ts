import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifyError } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import { notificationKeys, notificationService } from '../services/notificationService';

const UNREAD_POLL_INTERVAL_MS = 60_000;

export function isSafeInternalPath(url: string | null): url is string {
    return url !== null && url.startsWith('/') && !url.startsWith('//');
}

export function useUnreadNotificationCount() {
    const authStatus = useAuthStore((state) => state.status);

    return useQuery({
        queryKey: notificationKeys.unreadCount,
        queryFn: notificationService.unreadCount,
        enabled: authStatus === 'authenticated',
        refetchInterval: UNREAD_POLL_INTERVAL_MS,
    });
}

export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.markAsRead,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
        onError: notifyError,
    });
}

export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notificationService.markAllAsRead,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
        onError: notifyError,
    });
}
