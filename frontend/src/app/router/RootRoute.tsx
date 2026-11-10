import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router';
import { useFaviconSync } from '@/hooks/useBranding';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { setDisplayTimeZone } from '@/lib/format';

interface RouteHandle {
    title: string;
}

export function RootRoute() {
    const { pathname } = useLocation();
    const title = (useMatches().at(-1)?.handle as RouteHandle | undefined)?.title;
    const previousPathname = useRef(pathname);

    const { companyName, timeZone } = usePublicSettings();

    // Set during render, before the pages below format any date, so the first render uses the right zone.
    setDisplayTimeZone(timeZone);
    useFaviconSync();

    useEffect(() => {
        document.title = title === undefined ? companyName : `${title} - ${companyName}`;
    }, [title, companyName]);

    // A client-side navigation does not reset focus, so screen readers would stay on the old link.
    useEffect(() => {
        if (previousPathname.current !== pathname) {
            previousPathname.current = pathname;
            document.getElementById('main-content')?.focus();
        }
    }, [pathname]);

    return <Outlet />;
}
