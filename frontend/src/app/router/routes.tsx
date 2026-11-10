import { Outlet, type Params, type RouteObject } from 'react-router';
import { GuestRoute } from '@/app/guards/GuestRoute';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { RouteErrorPage } from '@/app/pages/RouteErrorPage';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { HomePage } from '@/features/dashboard/pages/HomePage';
import {
    AuditLogDetailPage,
    AuditLogListPage,
    ChangePasswordPage,
    ForgotPasswordPage,
    LoginPage,
    ResetPasswordPage,
    RoleCreatePage,
    RoleDetailPage,
    RoleEditPage,
    RoleListPage,
    SettingsPage,
    UserCreatePage,
    UserDetailPage,
    UserEditPage,
    UserListPage,
} from './lazyPages';
import { RootRoute } from './RootRoute';
import { AUDIT_LOGS_CRUMB, ROLES_CRUMB, USERS_CRUMB } from './routeHandle';

export const routes: RouteObject[] = [
    {
        element: <RootRoute />,
        errorElement: <RouteErrorPage />,
        children: [
            {
                element: (
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        // Pathless, so a crash in a page keeps the sidebar and header around the error.
                        errorElement: <RouteErrorPage />,
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
                                handle: { title: 'Tambah pengguna', parents: () => [USERS_CRUMB] },
                            },
                            {
                                path: 'users/:userId',
                                element: (
                                    <ProtectedRoute requiredPermission="user.view">
                                        <UserDetailPage />
                                    </ProtectedRoute>
                                ),
                                handle: { title: 'Detail pengguna', parents: () => [USERS_CRUMB] },
                            },
                            {
                                path: 'users/:userId/edit',
                                element: (
                                    <ProtectedRoute requiredPermission="user.update">
                                        <UserEditPage />
                                    </ProtectedRoute>
                                ),
                                handle: {
                                    title: 'Ubah pengguna',
                                    parents: ({ userId }: Params) => [
                                        USERS_CRUMB,
                                        { label: 'Detail pengguna', to: `/users/${userId}` },
                                    ],
                                },
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
                                handle: { title: 'Tambah role', parents: () => [ROLES_CRUMB] },
                            },
                            {
                                path: 'roles/:roleId',
                                element: (
                                    <ProtectedRoute requiredPermission="role.view">
                                        <RoleDetailPage />
                                    </ProtectedRoute>
                                ),
                                handle: { title: 'Detail role', parents: () => [ROLES_CRUMB] },
                            },
                            {
                                path: 'roles/:roleId/edit',
                                element: (
                                    <ProtectedRoute requiredPermission="role.update">
                                        <RoleEditPage />
                                    </ProtectedRoute>
                                ),
                                handle: {
                                    title: 'Ubah role',
                                    parents: ({ roleId }: Params) => [
                                        ROLES_CRUMB,
                                        { label: 'Detail role', to: `/roles/${roleId}` },
                                    ],
                                },
                            },
                            {
                                path: 'audit-logs',
                                element: (
                                    <ProtectedRoute requiredPermission="audit.view">
                                        <AuditLogListPage />
                                    </ProtectedRoute>
                                ),
                                handle: { title: 'Audit Log' },
                            },
                            {
                                path: 'audit-logs/:auditLogId',
                                element: (
                                    <ProtectedRoute requiredPermission="audit.view">
                                        <AuditLogDetailPage />
                                    </ProtectedRoute>
                                ),
                                handle: {
                                    title: 'Detail aktivitas',
                                    parents: () => [AUDIT_LOGS_CRUMB],
                                },
                            },
                            {
                                path: 'settings',
                                element: (
                                    <ProtectedRoute requiredPermission="system_config.view">
                                        <SettingsPage />
                                    </ProtectedRoute>
                                ),
                                handle: { title: 'Pengaturan sistem' },
                            },
                        ],
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
