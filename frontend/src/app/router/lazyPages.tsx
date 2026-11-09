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
