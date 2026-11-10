const COOKIE_NAME = 'sidebar_state';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const COLLAPSED_SECTIONS_KEY = 'sidebar_collapsed_sections';

/**
 * Whether the user last left the sidebar open on a desktop. Open unless they closed it.
 */
export function readSidebarState(): boolean {
    return !document.cookie.includes(`${COOKIE_NAME}=false`);
}

export function saveSidebarState(open: boolean): void {
    document.cookie = `${COOKIE_NAME}=${open}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
}

/**
 * Navigation section IDs collapsed by the user inside the sidebar.
 */
export function readCollapsedSections(): string[] {
    try {
        const raw = localStorage.getItem(COLLAPSED_SECTIONS_KEY);

        if (raw === null) {
            return [];
        }

        const parsed: unknown = JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [];
    } catch {
        return [];
    }
}

export function saveCollapsedSections(sectionIds: string[]): void {
    try {
        if (sectionIds.length === 0) {
            localStorage.removeItem(COLLAPSED_SECTIONS_KEY);

            return;
        }

        localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(sectionIds));
    } catch {
        return;
    }
}
