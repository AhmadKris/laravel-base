import { API_ROOT, apiClient } from '@/lib/api-client';
import type { ApiEnvelope, AuthenticatedUser } from '@/types/api-response';

export const authService = {
    async getCurrentUser(): Promise<AuthenticatedUser> {
        const response = await apiClient.get<ApiEnvelope<AuthenticatedUser>>('/auth/user');

        return response.data.data;
    },

    async logout(): Promise<void> {
        await apiClient.post('/logout', undefined, { baseURL: API_ROOT });
    },
};
