import { Outlet, type RouteObject } from 'react-router';
import { GuestRoute } from '@/app/guards/GuestRoute';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { HomePage } from '@/features/dashboard/pages/HomePage';
import { ChangePasswordPage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from './lazyPages';

export const routes: RouteObject[] = [
    {
        element: (
            <ProtectedRoute>
                <AppLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <HomePage /> },
            { path: 'change-password', element: <ChangePasswordPage /> },
        ],
    },
    {
        element: <AuthLayout />,
        children: [
            {
                element: (
                    <GuestRoute>
                        <Outlet />
                    </GuestRoute>
                ),
                children: [
                    { path: 'login', element: <LoginPage /> },
                    { path: 'forgot-password', element: <ForgotPasswordPage /> },
                ],
            },
            // Not guest-only: a link from the email must still work in a browser that is signed in.
            { path: 'reset-password', element: <ResetPasswordPage /> },
        ],
    },
    { path: '*', element: <NotFoundPage /> },
];
