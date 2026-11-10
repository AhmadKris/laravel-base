import type { TableFilters } from '@/hooks/useTableParams';
import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, AuditLog, AuditModule, PaginatedEnvelope } from '@/types/api-response';

export interface AuditLogFilters extends TableFilters {
    user_id?: string;
    module?: AuditModule;
    date_from?: string;
    date_to?: string;
}

export const auditLogKeys = {
    all: ['audit-logs'] as const,
    list: (filters: AuditLogFilters) => ['audit-logs', 'list', filters] as const,
    detail: (id: string) => ['audit-logs', 'detail', id] as const,
};

export const auditLogService = {
    async list(filters: AuditLogFilters): Promise<PaginatedEnvelope<AuditLog>> {
        const response = await apiClient.get<PaginatedEnvelope<AuditLog>>('/audit-logs', {
            params: filters,
        });

        return response.data;
    },

    async get(id: string): Promise<AuditLog> {
        const response = await apiClient.get<ApiEnvelope<AuditLog>>(`/audit-logs/${id}`);

        return response.data.data;
    },
};
