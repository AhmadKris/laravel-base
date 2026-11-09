import { apiClient } from '@/lib/api-client';
import type { AuditLog, PaginatedEnvelope } from '@/types/api-response';

const RECENT_ACTIVITY_LIMIT = 5;

export type StatFilters = Record<string, string>;

export const dashboardService = {
    async countRecords(path: string, filters: StatFilters): Promise<number> {
        const response = await apiClient.get<PaginatedEnvelope<unknown>>(path, {
            params: { ...filters, per_page: 1 },
        });

        return response.data.meta.pagination.total;
    },

    async getRecentActivity(): Promise<AuditLog[]> {
        const response = await apiClient.get<PaginatedEnvelope<AuditLog>>('/audit-logs', {
            params: {
                per_page: RECENT_ACTIVITY_LIMIT,
                sort_by: 'created_at',
                sort_direction: 'desc',
            },
        });

        return response.data.data;
    },
};
