import { API_ROOT, apiClient } from '@/lib/api-client';
import type {
    ApiEnvelope,
    AuthenticatedUser,
    ChangePasswordPayload,
    ForgotPasswordPayload,
    ResetPasswordPayload,
} from '@/types/api-response';
import type { LoginValues } from '../schemas';

export const authService = {
    async getCurrentUser(): Promise<AuthenticatedUser> {
        const response = await apiClient.get<ApiEnvelope<AuthenticatedUser>>('/auth/user');

        return response.data.data;
    },

    async login(credentials: LoginValues): Promise<AuthenticatedUser> {
        const response = await apiClient.post<ApiEnvelope<AuthenticatedUser>>(
            '/login',
            credentials,
            { baseURL: API_ROOT },
        );

        return response.data.data;
    },

    async logout(): Promise<void> {
        await apiClient.post('/logout', undefined, { baseURL: API_ROOT });
    },

    async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
        await apiClient.post('/auth/forgot-password', payload);
    },

    async resetPassword(payload: ResetPasswordPayload): Promise<void> {
        await apiClient.post('/auth/reset-password', payload);
    },

    async changePassword(payload: ChangePasswordPayload): Promise<void> {
        await apiClient.post('/auth/change-password', payload);
    },
};
