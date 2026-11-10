import { apiClient } from '@/lib/api-client';
import type {
    ApiEnvelope,
    PaginatedEnvelope,
    Role,
    StoreUserPayload,
    UpdateUserPayload,
    User,
} from '@/types/api-response';

const MAX_ROLE_OPTIONS = 100;

export interface UserListFilters {
    page: number;
    per_page?: number;
    search?: string;
    status?: string;
    role?: string;
    sort_by?: string;
    sort_direction?: string;
}

export const userKeys = {
    all: ['users'] as const,
    list: (filters: UserListFilters) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    roleOptions: ['users', 'role-options'] as const,
};

export const userService = {
    async list(filters: UserListFilters): Promise<PaginatedEnvelope<User>> {
        const response = await apiClient.get<PaginatedEnvelope<User>>('/users', {
            params: filters,
        });

        return response.data;
    },

    async get(id: string): Promise<User> {
        const response = await apiClient.get<ApiEnvelope<User>>(`/users/${id}`);

        return response.data.data;
    },

    async create(payload: StoreUserPayload): Promise<User> {
        const response = await apiClient.post<ApiEnvelope<User>>('/users', payload);

        return response.data.data;
    },

    async update(id: string, payload: UpdateUserPayload): Promise<User> {
        const response = await apiClient.patch<ApiEnvelope<User>>(`/users/${id}`, payload);

        return response.data.data;
    },

    async deactivate(id: string): Promise<void> {
        await apiClient.delete(`/users/${id}`);
    },

    async assignRoles(id: string, roles: string[]): Promise<User> {
        const response = await apiClient.put<ApiEnvelope<User>>(`/users/${id}/roles`, { roles });

        return response.data.data;
    },

    async listRoleOptions(): Promise<Role[]> {
        const response = await apiClient.get<PaginatedEnvelope<Role>>('/roles', {
            params: { per_page: MAX_ROLE_OPTIONS, sort_by: 'name', sort_direction: 'asc' },
        });

        return response.data.data;
    },
};
