import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { Notification } from '@/types/api-response';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
    return {
        id: '01932f5e-0000-7000-8000-000000000010',
        type: 'security.password_changed',
        category: 'security',
        title: 'Password akun diubah',
        message: 'Password akun Anda baru saja diubah.',
        action_url: '/change-password',
        is_read: false,
        read_at: null,
        created_at: '2026-11-10T03:00:00Z',
        ...overrides,
    };
}

function asUser(permissions: string[] = []) {
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

let listRequests: URLSearchParams[];

function serveNotifications(rows: Notification[], unreadCount?: number) {
    let unread = unreadCount ?? rows.filter((row) => !row.is_read).length;
    let currentRows = [...rows];

    server.use(
        http.get('*/api/v1/notifications/unread-count', () =>
            HttpResponse.json({
                success: true,
                message: '',
                data: { unread_count: unread },
                meta: null,
            }),
        ),
        http.get('*/api/v1/notifications', ({ request }) => {
            listRequests.push(new URL(request.url).searchParams);

            return HttpResponse.json({
                success: true,
                message: '',
                data: currentRows,
                meta: {
                    pagination: {
                        current_page: 1,
                        per_page: 10,
                        total: currentRows.length,
                        last_page: 1,
                        from: currentRows.length > 0 ? 1 : null,
                        to: currentRows.length > 0 ? currentRows.length : null,
                    },
                },
            });
        }),
        http.patch('*/api/v1/notifications/:id/read', ({ params }) => {
            const target = currentRows.find((item) => item.id === params.id);
            const updated: Notification = {
                ...(target ?? makeNotification({ id: String(params.id) })),
                is_read: true,
                read_at: '2026-11-10T04:00:00Z',
            };

            currentRows = currentRows.map((item) => (item.id === params.id ? updated : item));
            if (target !== undefined && !target.is_read) {
                unread = Math.max(0, unread - 1);
            }

            return HttpResponse.json({ success: true, message: '', data: updated, meta: null });
        }),
        http.post('*/api/v1/notifications/read-all', () => {
            const marked = currentRows.filter((item) => !item.is_read).length;
            currentRows = currentRows.map((item) => ({
                ...item,
                is_read: true,
                read_at: item.read_at ?? '2026-11-10T04:00:00Z',
            }));
            unread = 0;

            return HttpResponse.json({
                success: true,
                message: '',
                data: { unread_count: 0, marked_count: marked },
                meta: null,
            });
        }),
    );
}

beforeEach(() => {
    listRequests = [];
    document.cookie = 'XSRF-TOKEN=existing; path=/';
    server.use(
        http.get('*/api/v1/system-configurations/public', () =>
            HttpResponse.json({
                success: true,
                message: '',
                data: {
                    'company.name': 'Enterprise System',
                    'localization.timezone': 'Asia/Jakarta',
                },
                meta: null,
            }),
        ),
    );
});

describe('notification bell popover', () => {
    it('shows the unread badge, opens recent notifications, and marks an item as read on click', async () => {
        asUser([]);
        const unreadItem = makeNotification();
        serveNotifications([unreadItem]);
        const user = userEvent.setup();

        const router = renderApp('/');

        const bell = await screen.findByRole('button', { name: 'Notifikasi, 1 belum dibaca' });
        expect(bell).toHaveTextContent('1');

        await user.click(bell);

        expect(await screen.findByText('Password akun diubah')).toBeVisible();
        await user.click(screen.getByRole('button', { name: /Password akun diubah/ }));

        await waitFor(() => expect(router.state.location.pathname).toBe('/change-password'));
        expect(await screen.findByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
    });

    it('caps badge count at 99+ and marks all as read from the popover', async () => {
        asUser([]);
        serveNotifications([makeNotification()], 120);
        const user = userEvent.setup();

        renderApp('/');

        const bell = await screen.findByRole('button', { name: 'Notifikasi, 120 belum dibaca' });
        expect(bell).toHaveTextContent('99+');

        await user.click(bell);
        await user.click(await screen.findByRole('button', { name: 'Tandai semua dibaca' }));

        expect(await screen.findByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
    });

    it('ignores unsafe external action_url values when clicking a notification', async () => {
        asUser([]);
        const unsafe = makeNotification({ action_url: 'https://evil.example/phish' });
        serveNotifications([unsafe]);
        const user = userEvent.setup();

        const router = renderApp('/');

        await user.click(await screen.findByRole('button', { name: 'Notifikasi, 1 belum dibaca' }));
        await user.click(await screen.findByRole('button', { name: /Password akun diubah/ }));

        await waitFor(() => expect(router.state.location.pathname).toBe('/'));
        expect(await screen.findByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
    });

    it('navigates to the notifications page from the popover link', async () => {
        asUser([]);
        serveNotifications([]);
        const user = userEvent.setup();

        const router = renderApp('/');

        await user.click(await screen.findByRole('button', { name: 'Notifikasi' }));
        await user.click(await screen.findByRole('link', { name: 'Lihat semua notifikasi' }));

        await waitFor(() => expect(router.state.location.pathname).toBe('/notifications'));
        expect(await screen.findByRole('heading', { name: 'Notifikasi' })).toBeVisible();
    });
});

describe('notifications inbox page', () => {
    it('displays notifications, filters by status and category, searches, and sorts', async () => {
        asUser([]);
        serveNotifications([
            makeNotification(),
            makeNotification({
                id: '01932f5e-0000-7000-8000-000000000011',
                type: 'user.roles_updated',
                category: 'user',
                title: 'Role akun diperbarui',
                message: 'Role saat ini: Staff.',
                action_url: '/',
                is_read: true,
                read_at: '2026-11-10T03:30:00Z',
            }),
        ]);
        const user = userEvent.setup();

        renderApp('/notifications');

        expect(await screen.findByText('Password akun diubah')).toBeVisible();
        expect(screen.getByText('Role akun diperbarui')).toBeVisible();
        expect(screen.getByText('Belum dibaca')).toBeVisible();
        expect(screen.getByText('Sudah dibaca')).toBeVisible();

        await user.type(screen.getByRole('searchbox', { name: 'Cari notifikasi' }), 'role');
        await waitFor(() => expect(listRequests.at(-1)?.get('search')).toBe('role'));

        await user.click(screen.getByRole('combobox', { name: 'Filter status baca' }));
        await user.click(await screen.findByRole('option', { name: 'Belum dibaca' }));
        await waitFor(() => expect(listRequests.at(-1)?.get('status')).toBe('unread'));

        await user.click(screen.getByRole('combobox', { name: 'Filter kategori' }));
        await user.click(await screen.findByRole('option', { name: 'Keamanan' }));
        await waitFor(() => expect(listRequests.at(-1)?.get('category')).toBe('security'));

        await user.click(screen.getByRole('button', { name: 'Waktu' }));
        await waitFor(() => expect(listRequests.at(-1)?.get('sort_by')).toBe('created_at'));

        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-10T03:00:00Z'));

        await user.click(screen.getByRole('button', { name: /Rentang waktu:/ }));
        await user.click(await screen.findByRole('button', { name: 'Hari ini' }));
        await waitFor(() => {
            const latest = listRequests.at(-1);
            expect(latest?.get('date_from')).toBe('2026-11-10T00:00:00+07:00');
            expect(latest?.get('date_to')).toBe('2026-11-10T23:59:59+07:00');
        });

        vi.useRealTimers();

        await user.click(screen.getByRole('button', { name: 'Hapus filter' }));
        await waitFor(() => {
            const latest = listRequests.at(-1);
            expect(latest?.get('search')).toBeNull();
            expect(latest?.get('status')).toBeNull();
            expect(latest?.get('category')).toBeNull();
            expect(latest?.get('date_from')).toBeNull();
            expect(latest?.get('date_to')).toBeNull();
        });
    });

    it('marks a row as read via the row button without navigating', async () => {
        asUser([]);
        serveNotifications([makeNotification()]);
        const user = userEvent.setup();

        const router = renderApp('/notifications');

        const row = (await screen.findByText('Password akun diubah')).closest('tr') as HTMLElement;
        await user.click(within(row).getByRole('button', { name: 'Tandai dibaca' }));

        expect(await screen.findByText('Sudah dibaca')).toBeVisible();
        expect(router.state.location.pathname).toBe('/notifications');
    });

    it('marks all notifications as read and disables the action when none remain', async () => {
        asUser([]);
        serveNotifications([makeNotification()]);
        const user = userEvent.setup();

        renderApp('/notifications');

        const button = await screen.findByRole('button', { name: 'Tandai semua dibaca' });
        await waitFor(() => expect(button).toBeEnabled());

        await user.click(button);

        await waitFor(() => expect(button).toBeDisabled());
        expect(screen.getByText('Sudah dibaca')).toBeVisible();
    });

    it('shows empty and error states with retry', async () => {
        asUser([]);
        let fail = true;
        server.use(
            http.get('*/api/v1/notifications', () => {
                if (fail) {
                    return HttpResponse.json(
                        {
                            success: false,
                            message: 'Gagal memuat data',
                            code: 'SYSTEM_INTERNAL_ERROR',
                            errors: null,
                        },
                        { status: 500 },
                    );
                }

                return HttpResponse.json({
                    success: true,
                    message: '',
                    data: [],
                    meta: {
                        pagination: {
                            current_page: 1,
                            per_page: 10,
                            total: 0,
                            last_page: 1,
                            from: null,
                            to: null,
                        },
                    },
                });
            }),
        );
        const user = userEvent.setup();

        renderApp('/notifications');

        expect(await screen.findByText('Notifikasi tidak dapat dimuat')).toBeVisible();

        fail = false;
        await user.click(screen.getByRole('button', { name: 'Coba lagi' }));

        expect(await screen.findByText('Belum ada notifikasi')).toBeVisible();
    });
});
