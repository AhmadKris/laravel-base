import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router';
import { useFaviconSync } from '@/hooks/useBranding';
import { APP_NAME } from '@/lib/app-name';

interface RouteHandle {
    title: string;
}

export function RootRoute() {
    const { pathname } = useLocation();
    const title = (useMatches().at(-1)?.handle as RouteHandle | undefined)?.title;
    const previousPathname = useRef(pathname);

    useFaviconSync();

    useEffect(() => {
        document.title = title === undefined ? APP_NAME : `${title} - ${APP_NAME}`;
    }, [title]);

    // A client-side navigation does not reset focus, so screen readers would stay on the old link.
    useEffect(() => {
        if (previousPathname.current !== pathname) {
            previousPathname.current = pathname;
            document.getElementById('main-content')?.focus();
        }
    }, [pathname]);

    return <Outlet />;
}
