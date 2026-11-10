import { Outlet, type RouteObject } from 'react-router';
import { GuestRoute } from '@/app/guards/GuestRoute';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { HomePage } from '@/features/dashboard/pages/HomePage';
import {
    ChangePasswordPage,
    ForgotPasswordPage,
    LoginPage,
    ResetPasswordPage,
    RoleCreatePage,
    RoleDetailPage,
    RoleEditPage,
    RoleListPage,
    UserCreatePage,
    UserDetailPage,
    UserEditPage,
    UserListPage,
} from './lazyPages';
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
                    {
                        path: 'users',
                        element: (
                            <ProtectedRoute requiredPermission="user.view">
                                <UserListPage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Pengguna' },
                    },
                    {
                        path: 'users/new',
                        element: (
                            <ProtectedRoute requiredPermission="user.create">
                                <UserCreatePage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Tambah pengguna' },
                    },
                    {
                        path: 'users/:userId',
                        element: (
                            <ProtectedRoute requiredPermission="user.view">
                                <UserDetailPage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Detail pengguna' },
                    },
                    {
                        path: 'users/:userId/edit',
                        element: (
                            <ProtectedRoute requiredPermission="user.update">
                                <UserEditPage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Ubah pengguna' },
                    },
                    {
                        path: 'roles',
                        element: (
                            <ProtectedRoute requiredPermission="role.view">
                                <RoleListPage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Role' },
                    },
                    {
                        path: 'roles/new',
                        element: (
                            <ProtectedRoute requiredPermission="role.create">
                                <RoleCreatePage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Tambah role' },
                    },
                    {
                        path: 'roles/:roleId',
                        element: (
                            <ProtectedRoute requiredPermission="role.view">
                                <RoleDetailPage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Detail role' },
                    },
                    {
                        path: 'roles/:roleId/edit',
                        element: (
                            <ProtectedRoute requiredPermission="role.update">
                                <RoleEditPage />
                            </ProtectedRoute>
                        ),
                        handle: { title: 'Ubah role' },
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
