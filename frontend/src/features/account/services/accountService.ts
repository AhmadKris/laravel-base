import { apiClient } from '@/lib/api-client';
import type {
    Account,
    ActiveSession,
    ApiEnvelope,
    ConfirmEmailChangePayload,
    PendingEmailChange,
    RequestEmailChangePayload,
    UpdateAccountPayload,
} from '@/types/api-response';

export const accountKeys = {
    account: ['account'] as const,
    sessions: ['account', 'sessions'] as const,
};

export const accountService = {
    async get(): Promise<Account> {
        const response = await apiClient.get<ApiEnvelope<Account>>('/account');

        return response.data.data;
    },

    async update(payload: UpdateAccountPayload): Promise<Account> {
        const response = await apiClient.patch<ApiEnvelope<Account>>('/account', payload);

        return response.data.data;
    },

    async uploadAvatar(file: File): Promise<Account> {
        const body = new FormData();
        body.append('file', file);
        const response = await apiClient.post<ApiEnvelope<Account>>('/account/avatar', body);

        return response.data.data;
    },

    async removeAvatar(): Promise<Account> {
        const response = await apiClient.delete<ApiEnvelope<Account>>('/account/avatar');

        return response.data.data;
    },

    async requestEmailChange(payload: RequestEmailChangePayload): Promise<PendingEmailChange> {
        const response = await apiClient.post<ApiEnvelope<PendingEmailChange>>(
            '/account/email',
            payload,
        );

        return response.data.data;
    },

    async cancelEmailChange(): Promise<void> {
        await apiClient.delete('/account/email');
    },

    async confirmEmailChange(payload: ConfirmEmailChangePayload): Promise<void> {
        await apiClient.post('/auth/email-change/confirm', payload);
    },

    async sessions(): Promise<ActiveSession[]> {
        const response = await apiClient.get<ApiEnvelope<ActiveSession[]>>('/auth/sessions');

        return response.data.data;
    },

    async revokeSession(id: string): Promise<void> {
        await apiClient.delete(`/auth/sessions/${id}`);
    },

    async revokeOtherSessions(): Promise<number> {
        const response = await apiClient.delete<ApiEnvelope<{ ended: number }>>('/auth/sessions');

        return response.data.data.ended;
    },
};
