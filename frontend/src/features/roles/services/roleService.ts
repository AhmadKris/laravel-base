import type { TableFilters } from '@/hooks/useTableParams';
import { apiClient } from '@/lib/api-client';
import type {
    ApiEnvelope,
    PaginatedEnvelope,
    Permission,
    Role,
    StoreRolePayload,
    UpdateRolePayload,
} from '@/types/api-response';

export const roleKeys = {
    all: ['roles'] as const,
    lists: ['roles', 'list'] as const,
    list: (filters: TableFilters) => ['roles', 'list', filters] as const,
    detail: (id: string) => ['roles', 'detail', id] as const,
    permissions: ['roles', 'permissions'] as const,
};

export const roleService = {
    async list(filters: TableFilters): Promise<PaginatedEnvelope<Role>> {
        const response = await apiClient.get<PaginatedEnvelope<Role>>('/roles', {
            params: filters,
        });

        return response.data;
    },

    async get(id: string): Promise<Role> {
        const response = await apiClient.get<ApiEnvelope<Role>>(`/roles/${id}`);

        return response.data.data;
    },

    async create(payload: StoreRolePayload): Promise<Role> {
        const response = await apiClient.post<ApiEnvelope<Role>>('/roles', payload);

        return response.data.data;
    },

    async update(id: number, payload: UpdateRolePayload): Promise<Role> {
        const response = await apiClient.patch<ApiEnvelope<Role>>(`/roles/${id}`, payload);

        return response.data.data;
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`/roles/${id}`);
    },

    async listPermissions(): Promise<Permission[]> {
        const response = await apiClient.get<ApiEnvelope<Permission[]>>('/permissions');

        return response.data.data;
    },
};
