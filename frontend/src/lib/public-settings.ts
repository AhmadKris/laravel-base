import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, JsonValue } from '@/types/api-response';

export const publicSettingKeys = {
    all: ['public-settings'] as const,
};

/**
 * Configuration marked public, readable without login, as a `key: value` object.
 */
export const publicSettingService = {
    async get(): Promise<Record<string, JsonValue>> {
        const response = await apiClient.get<ApiEnvelope<Record<string, JsonValue>>>(
            '/system-configurations/public',
        );

        return response.data.data;
    },
};
