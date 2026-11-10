import type { TableFilters } from '@/hooks/useTableParams';
import { apiClient } from '@/lib/api-client';
import type {
    ApiEnvelope,
    Notification,
    NotificationCategory,
    PaginatedEnvelope,
} from '@/types/api-response';

export type NotificationStatusFilter = 'unread' | 'read';

export interface NotificationFilters extends TableFilters {
    status?: NotificationStatusFilter;
    category?: NotificationCategory;
    date_from?: string;
    date_to?: string;
}

export interface UnreadCountResult {
    unread_count: number;
}

export interface MarkAllReadResult {
    unread_count: number;
    marked_count: number;
}

export const notificationKeys = {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    recent: ['notifications', 'recent'] as const,
    list: (filters: NotificationFilters) => ['notifications', 'list', filters] as const,
};

export const notificationService = {
    async list(filters: NotificationFilters): Promise<PaginatedEnvelope<Notification>> {
        const response = await apiClient.get<PaginatedEnvelope<Notification>>('/notifications', {
            params: filters,
        });

        return response.data;
    },

    async unreadCount(): Promise<UnreadCountResult> {
        const response = await apiClient.get<ApiEnvelope<UnreadCountResult>>(
            '/notifications/unread-count',
        );

        return response.data.data;
    },

    async markAsRead(id: string): Promise<Notification> {
        const response = await apiClient.patch<ApiEnvelope<Notification>>(
            `/notifications/${id}/read`,
        );

        return response.data.data;
    },

    async markAllAsRead(): Promise<MarkAllReadResult> {
        const response =
            await apiClient.post<ApiEnvelope<MarkAllReadResult>>('/notifications/read-all');

        return response.data.data;
    },
};
