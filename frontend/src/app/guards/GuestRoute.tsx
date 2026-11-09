import type { ReactNode } from 'react';
import { type Location, Navigate, useLocation } from 'react-router';
import { FormSkeleton } from '@/components/shared/skeletons';
import { useAuthStore } from '@/stores/auth-store';

interface GuestRouteProps {
    children: ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
    const status = useAuthStore((state) => state.status);
    const location = useLocation();

    if (status === 'loading') {
        return <FormSkeleton label="Memeriksa sesi" />;
    }

    if (status === 'authenticated') {
        const requested = (location.state as { from?: Location } | null)?.from;

        return <Navigate to={requested ?? '/'} replace />;
    }

    return children;
}
