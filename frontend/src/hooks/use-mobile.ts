import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
// Matches the Tailwind lg breakpoint, where the full sidebar and a table fit side by side.
const DESKTOP_BREAKPOINT = 1024;

function subscribeTo(query: string): (onChange: () => void) => () => void {
    return (onChange) => {
        const list = window.matchMedia(query);

        list.addEventListener('change', onChange);

        return () => list.removeEventListener('change', onChange);
    };
}

const subscribeMobile = subscribeTo(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
const subscribeTablet = subscribeTo(
    `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${DESKTOP_BREAKPOINT - 1}px)`,
);

export function useIsMobile(): boolean {
    return useSyncExternalStore(subscribeMobile, () => window.innerWidth < MOBILE_BREAKPOINT);
}

export function useIsTablet(): boolean {
    return useSyncExternalStore(
        subscribeTablet,
        () => window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < DESKTOP_BREAKPOINT,
    );
}
