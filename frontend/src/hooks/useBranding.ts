import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { brandingKeys, brandingService, brandingUrl } from '@/lib/branding';
import type { LogoDisplay } from '@/types/api-response';

const FAVICON_ID = 'app-favicon';

export const DEFAULT_LOGO_DISPLAY: LogoDisplay = {
    show_name: true,
    background: 'transparent',
    size: 'medium',
};

interface BrandingState {
    logoUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
    display: LogoDisplay;
}

/**
 * URLs are undefined while nothing is uploaded or the request failed, so the default look is shown.
 */
export function useBranding(): BrandingState {
    const { data } = useQuery({
        queryKey: brandingKeys.all,
        queryFn: brandingService.get,
        staleTime: 5 * 60 * 1000,
    });

    return {
        logoUrl: data?.logo ? brandingUrl('logo', data.logo.version) : undefined,
        logoDarkUrl: data?.logo_dark ? brandingUrl('logo-dark', data.logo_dark.version) : undefined,
        faviconUrl: data?.favicon ? brandingUrl('favicon', data.favicon.version) : undefined,
        display: data?.display ?? DEFAULT_LOGO_DISPLAY,
    };
}

export function useFaviconSync(): void {
    const { faviconUrl } = useBranding();

    useEffect(() => {
        document.getElementById(FAVICON_ID)?.remove();

        if (faviconUrl === undefined) {
            return;
        }

        const link = document.createElement('link');
        link.id = FAVICON_ID;
        link.rel = 'icon';
        link.href = faviconUrl;
        document.head.append(link);
    }, [faviconUrl]);
}
