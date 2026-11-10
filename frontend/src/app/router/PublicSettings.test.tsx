import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { JsonValue } from '@/types/api-response';

const USER_ID = '01932f5e-0000-7000-8000-000000000001';

let publicSettings: Record<string, JsonValue>;

function servePublicSettings() {
    server.use(
        http.get('*/api/v1/system-configurations/public', () =>
            HttpResponse.json({ success: true, message: '', data: publicSettings, meta: null }),
        ),
    );
}

function asUser(permissions: string[]) {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({
                success: true,
                message: '',
                data: makeUser(permissions),
                meta: null,
            }),
        ),
    );
}

function asGuest() {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json(
                { success: false, message: '', code: 'AUTH_UNAUTHENTICATED' },
                { status: 401 },
            ),
        ),
    );
}

const sidebarHeader = () => document.querySelector('[data-slot="sidebar-header"]') as HTMLElement;

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
    publicSettings = { 'company.name': 'PT Maju Jaya', 'localization.timezone': 'Asia/Jayapura' };
});

describe('company name', () => {
    it('names the app after the company in the sidebar and the tab title', async () => {
        asUser([]);
        servePublicSettings();

        renderApp('/');

        await waitFor(() => expect(sidebarHeader()).toHaveTextContent('PT Maju Jaya'));
        await waitFor(() => expect(document.title).toBe('Beranda - PT Maju Jaya'));
    });

    it('shows the company name on the login page', async () => {
        asGuest();
        servePublicSettings();

        renderApp('/login');

        expect(await screen.findByRole('heading', { name: 'Masuk ke PT Maju Jaya' })).toBeVisible();
        expect(
            screen.getAllByText(
                `© ${new Date().getFullYear()} PT Maju Jaya. Hak cipta dilindungi.`,
            ),
        ).not.toHaveLength(0);
    });

    it('keeps the built-in name when the settings cannot be loaded', async () => {
        asUser([]);
        server.use(
            http.get('*/api/v1/system-configurations/public', () =>
                HttpResponse.json(
                    { success: false, message: '', code: 'SYSTEM_INTERNAL_ERROR', errors: null },
                    { status: 500 },
                ),
            ),
        );

        renderApp('/');

        await waitFor(() => expect(sidebarHeader()).toHaveTextContent('Enterprise System'));
    });

    it('updates the name across the app after saving it in the settings', async () => {
        asUser(['system_config.view', 'system_config.update']);
        servePublicSettings();
        server.use(
            http.get('*/api/v1/system-configurations', () =>
                HttpResponse.json({
                    success: true,
                    message: '',
                    data: [
                        {
                            key: 'company.name',
                            value: publicSettings['company.name'],
                            is_public: true,
                            is_sensitive: false,
                            description: null,
                            version: 1,
                            updated_at: null,
                        },
                    ],
                    meta: {
                        pagination: {
                            current_page: 1,
                            per_page: 100,
                            total: 1,
                            last_page: 1,
                            from: 1,
                            to: 1,
                        },
                    },
                }),
            ),
            http.patch('*/api/v1/system-configurations/company.name', async ({ request }) => {
                const { value } = (await request.json()) as { value: string };
                publicSettings = { ...publicSettings, 'company.name': value };

                return HttpResponse.json({
                    success: true,
                    message: '',
                    data: {
                        key: 'company.name',
                        value,
                        is_public: true,
                        is_sensitive: false,
                        description: null,
                        version: 2,
                        updated_at: null,
                    },
                    meta: null,
                });
            }),
        );

        renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        await userEvent.clear(name);
        await userEvent.type(name, 'PT Baru Sejahtera');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        await waitFor(() => expect(sidebarHeader()).toHaveTextContent('PT Baru Sejahtera'));
        expect(document.title).toBe('Pengaturan sistem - PT Baru Sejahtera');
    });
});

describe('time zone', () => {
    it('shows dates in the configured time zone', async () => {
        asUser(['user.view']);
        servePublicSettings();
        server.use(
            http.get(`*/api/v1/users/${USER_ID}`, () =>
                HttpResponse.json({
                    success: true,
                    message: '',
                    data: {
                        id: USER_ID,
                        name: 'Budi Santoso',
                        username: null,
                        email: 'budi@example.com',
                        status: 'active',
                        roles: ['Staff'],
                        created_at: '2026-11-01T03:00:00Z',
                        updated_at: '2026-11-01T03:00:00Z',
                    },
                    meta: null,
                }),
            ),
        );

        renderApp(`/users/${USER_ID}`);

        expect(await screen.findByText('1 Nov 2026, 12.00')).toBeVisible();
    });
});
