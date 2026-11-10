import { ChevronRight } from 'lucide-react';
import { Link, useMatches, useParams } from 'react-router';
import type { Crumb, RouteHandle } from '@/app/router/routeHandle';

const HOME: Crumb = { label: 'Beranda', to: '/' };

/**
 * Where the page sits in the app, from the handle of the current route. Hidden on phones,
 * where the back link on the page does the same job in less space.
 */
export function HeaderBreadcrumb() {
    const handle = useMatches().at(-1)?.handle as RouteHandle | undefined;
    const params = useParams();

    if (handle === undefined) {
        return null;
    }

    const trail = handle.title === HOME.label ? [] : [HOME, ...(handle.parents?.(params) ?? [])];

    return (
        <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
            <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                {trail.map((crumb) => (
                    <li key={crumb.to} className="flex shrink-0 items-center gap-1.5">
                        <Link
                            to={crumb.to}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {crumb.label}
                        </Link>
                        <ChevronRight
                            aria-hidden="true"
                            className="size-3.5 text-muted-foreground"
                        />
                    </li>
                ))}
                <li className="min-w-0 truncate font-medium" aria-current="page">
                    {handle.title}
                </li>
            </ol>
        </nav>
    );
}
