import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, Branding, BrandingAsset } from '@/types/api-response';

export const brandingKeys = {
    all: ['branding'] as const,
};

export const brandingService = {
    async get(): Promise<Branding> {
        const response = await apiClient.get<ApiEnvelope<Branding>>('/branding');

        return response.data.data;
    },

    async upload(asset: BrandingAsset, file: File): Promise<void> {
        const body = new FormData();
        body.append('file', file);

        await apiClient.post(`/branding/${asset}`, body);
    },

    async remove(asset: BrandingAsset): Promise<void> {
        await apiClient.delete(`/branding/${asset}`);
    },
};

/**
 * The version in the URL makes the browser fetch a replaced file instead of its cached copy.
 */
export function brandingUrl(asset: BrandingAsset, version: number): string {
    return `${apiClient.defaults.baseURL ?? ''}/branding/${asset}?v=${version}`;
}
