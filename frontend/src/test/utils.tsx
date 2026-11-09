import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AuthenticatedUser } from '@/types/api-response';

export function renderWithProviders(ui: ReactElement): RenderResult {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

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
        department: { id: '01932f5e-1234-7000-8000-123456789def', name: 'Finance' },
    };
}
