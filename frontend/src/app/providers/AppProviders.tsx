import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLoadCurrentUser } from '@/features/authentication/hooks/useLoadCurrentUser';
import { setUnauthenticatedHandler } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth-store';

const MAX_QUERY_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
    const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;

    return !isClientError && failureCount < MAX_QUERY_RETRIES;
}

interface AppProvidersProps {
    children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
    const [queryClient] = useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } }),
    );
    const loadCurrentUser = useLoadCurrentUser();

    useEffect(() => {
        setUnauthenticatedHandler(useAuthStore.getState().setGuest);
        void loadCurrentUser();
    }, [loadCurrentUser]);

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                {children}
                <Toaster />
            </TooltipProvider>
        </QueryClientProvider>
    );
}
