import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { routes } from '@/app/router/routes';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AuthenticatedUser } from '@/types/api-response';

// Lazy pages loaded for the first time on a cold cache outlast the default findBy timeout.
import.meta.glob(['/src/features/*/pages/*.tsx', '!/src/features/*/pages/*.test.tsx'], {
    eager: true,
});

export function renderApp(path: string) {
    const router = createMemoryRouter(routes, { initialEntries: [path] });

    render(
        <AppProviders>
            <RouterProvider router={router} />
        </AppProviders>,
    );

    return router;
}

export function renderWithProviders(
    ui: ReactElement,
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
): RenderResult {
    return render(
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>{ui}</TooltipProvider>
        </QueryClientProvider>,
    );
}

export function makeUser(permissions: string[] = []): AuthenticatedUser {
    return {
        id: '01932f5e-1234-7000-8000-123456789abc',
        name: 'Ani Lestari',
        email: 'ani@example.com',
        roles: ['Staff'],
        permissions,
    };
}
