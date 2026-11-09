import { lazy } from 'react';

export const LoginPage = lazy(() =>
    import('@/features/authentication/pages/LoginPage').then((module) => ({
        default: module.LoginPage,
    })),
);

export const ForgotPasswordPage = lazy(() =>
    import('@/features/authentication/pages/ForgotPasswordPage').then((module) => ({
        default: module.ForgotPasswordPage,
    })),
);

export const ResetPasswordPage = lazy(() =>
    import('@/features/authentication/pages/ResetPasswordPage').then((module) => ({
        default: module.ResetPasswordPage,
    })),
);

export const ChangePasswordPage = lazy(() =>
    import('@/features/authentication/pages/ChangePasswordPage').then((module) => ({
        default: module.ChangePasswordPage,
    })),
);

export const UserListPage = lazy(() =>
    import('@/features/users/pages/UserListPage').then((module) => ({
        default: module.UserListPage,
    })),
);

export const UserDetailPage = lazy(() =>
    import('@/features/users/pages/UserDetailPage').then((module) => ({
        default: module.UserDetailPage,
    })),
);

export const UserCreatePage = lazy(() =>
    import('@/features/users/pages/UserFormPages').then((module) => ({
        default: module.UserCreatePage,
    })),
);

export const UserEditPage = lazy(() =>
    import('@/features/users/pages/UserFormPages').then((module) => ({
        default: module.UserEditPage,
    })),
);
