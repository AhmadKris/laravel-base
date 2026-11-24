import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useAuthStore } from '@/stores/auth-store';

// The default menu of the backend, which lists only the items the user has the permission for.
const DEFAULT_MENU = [
    { key: 'users', label: 'Pengguna', path: '/users', icon: 'users', permission: 'user.view' },
    { key: 'roles', label: 'Role', path: '/roles', icon: 'shield-check', permission: 'role.view' },
    {
        key: 'audit-logs',
        label: 'Audit Log',
        path: '/audit-logs',
        icon: 'scroll-text',
        permission: 'audit.view',
    },
    {
        key: 'settings',
        label: 'Pengaturan',
        path: '/settings',
        icon: 'settings',
        permission: 'system_config.view',
    },
];

export const ENABLED_MODULES = [
    'audit',
    'system_configuration',
    'user_management',
    'authorization',
    'notification',
];

// Every page reads the branding and public settings, so tests that do not care get the defaults.
export const server = setupServer(
    http.get('*/api/v1/system-configurations/public', () =>
        HttpResponse.json({
            success: true,
            message: '',
            data: { 'company.name': 'Enterprise System' },
            meta: null,
        }),
    ),
    http.get('*/api/v1/branding', () =>
        HttpResponse.json({
            success: true,
            message: '',
            data: {
                logo: null,
                logo_dark: null,
                favicon: null,
                display: { show_name: true, background: 'transparent', size: 'medium' },
            },
            meta: null,
        }),
    ),
    http.get('*/api/v1/navigation', () => {
        const permissions = useAuthStore.getState().user?.permissions ?? [];
        const items = DEFAULT_MENU.filter(({ permission }) => permissions.includes(permission)).map(
            ({ key, label, path, icon }) => ({ key, label, path, icon }),
        );

        return HttpResponse.json({
            success: true,
            message: '',
            data: {
                sections:
                    items.length === 0
                        ? []
                        : [{ key: 'administration', label: 'Administrasi', items }],
                modules: ENABLED_MODULES,
            },
            meta: null,
        });
    }),
    // The account page reads the signed-in user, so tests that open it get that user's account.
    http.get('*/api/v1/account', () => {
        const user = useAuthStore.getState().user;

        return HttpResponse.json({
            success: true,
            message: '',
            data: {
                id: user?.id ?? '',
                name: user?.name ?? '',
                email: user?.email ?? '',
                username: null,
                phone: null,
                avatar: user?.avatar ?? null,
                pending_email: null,
                roles: user?.roles ?? [],
                last_login_at: null,
                created_at: '2026-11-01T03:00:00Z',
            },
            meta: null,
        });
    }),
    http.get('*/api/v1/auth/sessions', () =>
        HttpResponse.json({
            success: true,
            message: '',
            data: [
                {
                    id: 'a'.repeat(64),
                    ip_address: '127.0.0.1',
                    user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
                    last_active_at: '2026-11-24T03:00:00Z',
                    is_current: true,
                },
            ],
            meta: null,
        }),
    ),
    http.get('*/api/v1/notifications/unread-count', () =>
        HttpResponse.json({
            success: true,
            message: '',
            data: { unread_count: 0 },
            meta: null,
        }),
    ),
    http.get('*/api/v1/notifications', () =>
        HttpResponse.json({
            success: true,
            message: '',
            data: [],
            meta: {
                pagination: {
                    current_page: 1,
                    per_page: 20,
                    total: 0,
                    last_page: 1,
                    from: null,
                    to: null,
                },
            },
        }),
    ),
);
