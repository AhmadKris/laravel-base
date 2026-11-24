import { apiClient } from '@/lib/api-client';
import type {
    ApiEnvelope,
    LayoutSection,
    ModuleSettings,
    Navigation,
    NavigationLayout,
} from '@/types/api-response';

export const navigationKeys = {
    all: ['navigation'] as const,
    // The menu depends on the permissions of the user, so a different user never reuses it.
    menu: (userId: string) => ['navigation', 'menu', userId] as const,
    layout: ['navigation', 'layout'] as const,
    modules: ['navigation', 'modules'] as const,
};

export const navigationService = {
    async menu(): Promise<Navigation> {
        const response = await apiClient.get<ApiEnvelope<Navigation>>('/navigation');

        return response.data.data;
    },

    async layout(): Promise<NavigationLayout> {
        const response = await apiClient.get<ApiEnvelope<NavigationLayout>>('/navigation/layout');

        return response.data.data;
    },

    async saveLayout(sections: LayoutSection[], version: number): Promise<NavigationLayout> {
        const response = await apiClient.put<ApiEnvelope<NavigationLayout>>('/navigation/layout', {
            sections,
            version,
        });

        return response.data.data;
    },

    async modules(): Promise<ModuleSettings> {
        const response = await apiClient.get<ApiEnvelope<ModuleSettings>>('/modules');

        return response.data.data;
    },

    async saveModules(disabled: string[], version: number): Promise<ModuleSettings> {
        const response = await apiClient.put<ApiEnvelope<ModuleSettings>>('/modules', {
            disabled,
            version,
        });

        return response.data.data;
    },
};
