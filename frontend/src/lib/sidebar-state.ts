const COOKIE_NAME = 'sidebar_state';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Whether the user last left the sidebar open on a desktop. Open unless they closed it.
 */
export function readSidebarState(): boolean {
    return !document.cookie.includes(`${COOKIE_NAME}=false`);
}

export function saveSidebarState(open: boolean): void {
    document.cookie = `${COOKIE_NAME}=${open}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
}
