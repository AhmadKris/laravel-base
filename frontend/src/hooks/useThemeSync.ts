import { useEffect } from 'react';
import { DARK_MEDIA_QUERY, useThemeStore } from '@/stores/theme-store';

/**
 * Follows operating system theme changes and choices made in other tabs.
 */
export function useThemeSync(): void {
    useEffect(() => {
        const { syncWithEnvironment } = useThemeStore.getState();
        const media = window.matchMedia(DARK_MEDIA_QUERY);

        media.addEventListener('change', syncWithEnvironment);
        window.addEventListener('storage', syncWithEnvironment);

        return () => {
            media.removeEventListener('change', syncWithEnvironment);
            window.removeEventListener('storage', syncWithEnvironment);
        };
    }, []);
}
