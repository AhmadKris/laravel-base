import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { AppLayout } from '@/components/layouts/AppLayout';
import { HomePage } from '@/features/dashboard/pages/HomePage';

export const routes: RouteObject[] = [
    {
        element: (
            <ProtectedRoute>
                <AppLayout />
            </ProtectedRoute>
        ),
        children: [{ index: true, element: <HomePage /> }],
    },
    // Must stay outside ProtectedRoute: guests are redirected to /login, which would otherwise redirect forever.
    { path: '*', element: <NotFoundPage /> },
];
