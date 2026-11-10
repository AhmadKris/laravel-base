import { apiClient } from '@/lib/api-client';
import type {
    ApiEnvelope,
    PaginatedEnvelope,
    SystemConfiguration,
    UpdateConfigurationPayload,
} from '@/types/api-response';

const PAGE_SIZE = 100;

export const settingKeys = {
    all: ['settings'] as const,
};

export const settingService = {
    // The settings page shows every key at once, so it reads all pages.
    async listAll(): Promise<SystemConfiguration[]> {
        const configurations: SystemConfiguration[] = [];
        let page = 1;
        let lastPage: number;

        do {
            const response = await apiClient.get<PaginatedEnvelope<SystemConfiguration>>(
                '/system-configurations',
                { params: { page, per_page: PAGE_SIZE } },
            );

            configurations.push(...response.data.data);
            lastPage = response.data.meta.pagination.last_page;
            page += 1;
        } while (page <= lastPage);

        return configurations;
    },

    async update(key: string, payload: UpdateConfigurationPayload): Promise<SystemConfiguration> {
        const response = await apiClient.patch<ApiEnvelope<SystemConfiguration>>(
            `/system-configurations/${encodeURIComponent(key)}`,
            payload,
        );

        return response.data.data;
    },
};
