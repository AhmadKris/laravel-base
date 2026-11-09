import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ForbiddenPage } from '@/app/pages/ForbiddenPage';
import { ErrorState } from '@/components/shared/ErrorState';
import { AppShellSkeleton } from '@/components/shared/skeletons';
import { useLoadCurrentUser } from '@/features/authentication/hooks/useLoadCurrentUser';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/auth-store';

interface ProtectedRouteProps {
    requiredPermission?: string;
    children: ReactNode;
}

export function ProtectedRoute({ requiredPermission, children }: ProtectedRouteProps) {
    const status = useAuthStore((state) => state.status);
    const { can } = usePermission();
    const location = useLocation();
    const loadCurrentUser = useLoadCurrentUser();

    if (status === 'loading') {
        return <AppShellSkeleton label="Memeriksa sesi" />;
    }

    if (status === 'unavailable') {
        return (
            <ErrorState
                title="Sesi tidak dapat diperiksa"
                message="Server tidak dapat dihubungi."
                onRetry={loadCurrentUser}
            />
        );
    }

    if (status === 'guest') {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (status === 'signed-out') {
        return <Navigate to="/login" replace />;
    }

    if (requiredPermission !== undefined && !can(requiredPermission)) {
        return <ForbiddenPage />;
    }

    return children;
}
