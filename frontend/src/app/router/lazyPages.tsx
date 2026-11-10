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

export const RoleListPage = lazy(() =>
    import('@/features/roles/pages/RoleListPage').then((module) => ({
        default: module.RoleListPage,
    })),
);

export const RoleDetailPage = lazy(() =>
    import('@/features/roles/pages/RoleDetailPage').then((module) => ({
        default: module.RoleDetailPage,
    })),
);

export const RoleCreatePage = lazy(() =>
    import('@/features/roles/pages/RoleFormPages').then((module) => ({
        default: module.RoleCreatePage,
    })),
);

export const RoleEditPage = lazy(() =>
    import('@/features/roles/pages/RoleFormPages').then((module) => ({
        default: module.RoleEditPage,
    })),
);
