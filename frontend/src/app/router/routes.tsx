import { Outlet, type RouteObject } from 'react-router';
import { GuestRoute } from '@/app/guards/GuestRoute';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { HomePage } from '@/features/dashboard/pages/HomePage';
import { ChangePasswordPage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from './lazyPages';
import { RootRoute } from './RootRoute';

export const routes: RouteObject[] = [
    {
        element: <RootRoute />,
        children: [
            {
                element: (
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                ),
                children: [
                    { index: true, element: <HomePage />, handle: { title: 'Beranda' } },
                    {
                        path: 'change-password',
                        element: <ChangePasswordPage />,
                        handle: { title: 'Ubah password' },
                    },
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
                            { path: 'login', element: <LoginPage />, handle: { title: 'Masuk' } },
                            {
                                path: 'forgot-password',
                                element: <ForgotPasswordPage />,
                                handle: { title: 'Lupa password' },
                            },
                        ],
                    },
                    // Not guest-only: a link from the email must still work in a browser that is signed in.
                    {
                        path: 'reset-password',
                        element: <ResetPasswordPage />,
                        handle: { title: 'Buat password baru' },
                    },
                ],
            },
            {
                path: '*',
                element: <NotFoundPage />,
                handle: { title: 'Halaman tidak ditemukan' },
            },
        ],
    },
];
