import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { AuditLog } from '@/types/api-response';

const ACTOR_ID = '01932f5e-0000-7000-8000-000000000001';

function makeLog(overrides: Partial<AuditLog> = {}): AuditLog {
    return {
        id: 41,
        event: 'user.updated',
        event_label: 'memperbarui data pengguna',
        actor: { id: ACTOR_ID, name: 'Budi Santoso', email: 'budi@example.com' },
        subject: { type: 'user', id: '01932f5e-0000-7000-8000-000000000002', label: 'Sari Dewi' },
        properties: {
            old: { name: 'Sari' },
            new: { name: 'Sari Dewi' },
            context: { ip_address: '10.0.0.5', user_agent: 'Firefox', request_id: null },
        },
        created_at: '2026-11-01T03:00:00Z',
        ...overrides,
    };
}

function asUser(permissions = ['audit.view', 'user.view']) {
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

let requests: URLSearchParams[];

function serveList(rows: AuditLog[], lastPage = 1) {
    server.use(
        http.get('*/api/v1/audit-logs', ({ request }) => {
            requests.push(new URL(request.url).searchParams);

            return HttpResponse.json({
                success: true,
                message: '',
                data: rows,
                meta: {
                    pagination: {
                        current_page: 1,
                        per_page: 20,
                        total: rows.length,
                        last_page: lastPage,
                        from: rows.length ? 1 : null,
                        to: rows.length || null,
                    },
                },
            });
        }),
    );
}

function serveDetail(log: AuditLog) {
    server.use(
        http.get(`*/api/v1/audit-logs/${log.id}`, () =>
            HttpResponse.json({ success: true, message: '', data: log, meta: null }),
        ),
    );
}

const lastRequest = () => requests.at(-1) as URLSearchParams;

beforeEach(() => {
    requests = [];
    // Only the clock is fixed, so the presets resolve to known days while timers keep running.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T03:00:00Z'));
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

afterEach(() => {
    vi.useRealTimers();
});

describe('audit log list', () => {
    it('shows when, what, who, and on which object', async () => {
        asUser();
        serveList([
            makeLog(),
            makeLog({
                id: 42,
                event: 'auth.login_failed',
                event_label: 'gagal masuk',
                actor: null,
                subject: null,
            }),
            makeLog({
                id: 43,
                event: 'role.deleted',
                event_label: 'menghapus role',
                subject: { type: 'role', id: null, label: null },
            }),
        ]);

        renderApp('/audit-logs');

        const row = (
            await screen.findByRole('link', { name: 'Memperbarui data pengguna' })
        ).closest('tr') as HTMLElement;
        expect(within(row).getByText('user.updated')).toBeVisible();
        expect(within(row).getByText('Budi Santoso')).toBeVisible();
        expect(within(row).getByText('Sari Dewi')).toBeVisible();
        expect(within(row).getByText('Pengguna')).toBeVisible();

        const failed = screen
            .getByRole('link', { name: 'Gagal masuk' })
            .closest('tr') as HTMLElement;
        expect(within(failed).getByText('Tanpa akun')).toBeVisible();
        expect(screen.getByText('Sudah dihapus')).toBeVisible();
        expect(screen.queryByRole('button', { name: /Hapus|Ubah/ })).not.toBeInTheDocument();
    });

    it('opens on today in the company time zone', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs');

        expect(
            await screen.findByRole('button', { name: 'Rentang waktu: Hari ini' }),
        ).toBeVisible();
        await waitFor(() =>
            expect(lastRequest().get('date_from')).toBe('2026-11-10T00:00:00+07:00'),
        );
        expect(lastRequest().get('date_to')).toBe('2026-11-10T23:59:59+07:00');
    });

    it('sends the module, a preset range, search, and sorting to the API', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs');
        await screen.findByText('user.updated');

        await userEvent.click(screen.getByRole('combobox', { name: 'Filter modul' }));
        await userEvent.click(await screen.findByRole('option', { name: 'Pengguna' }));
        await waitFor(() => expect(lastRequest().get('module')).toBe('user'));

        await userEvent.click(screen.getByRole('button', { name: /Rentang waktu/ }));
        await userEvent.click(await screen.findByRole('button', { name: '7 hari terakhir' }));
        await waitFor(() =>
            expect(lastRequest().get('date_from')).toBe('2026-11-04T00:00:00+07:00'),
        );
        expect(
            screen.getByRole('button', { name: 'Rentang waktu: 7 hari terakhir' }),
        ).toBeVisible();

        await userEvent.type(
            screen.getByRole('searchbox', { name: 'Cari aktivitas atau pengguna' }),
            'updated',
        );
        await waitFor(() => expect(lastRequest().get('search')).toBe('updated'));

        await userEvent.click(screen.getByRole('button', { name: /Waktu/ }));
        await waitFor(() => expect(lastRequest().get('sort_by')).toBe('created_at'));
    });

    it('empties the search field when the menu link drops the search', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs?search=budi');
        const search = await screen.findByRole('searchbox', {
            name: 'Cari aktivitas atau pengguna',
        });
        expect(search).toHaveValue('budi');

        await userEvent.click(
            within(screen.getByRole('navigation', { name: 'Menu utama' })).getByRole('link', {
                name: 'Audit Log',
            }),
        );

        await waitFor(() => expect(lastRequest().has('search')).toBe(false));
        expect(search).toHaveValue('');
    });

    it('keeps a trailing space while the search is being typed', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs');
        const search = await screen.findByRole('searchbox', {
            name: 'Cari aktivitas atau pengguna',
        });
        await userEvent.type(search, 'budi ');
        await waitFor(() => expect(lastRequest().get('search')).toBe('budi'));
        await userEvent.type(search, 'santoso');

        expect(search).toHaveValue('budi santoso');
        await waitFor(() => expect(lastRequest().get('search')).toBe('budi santoso'));
    });

    it('shows every record when all time is chosen', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs');
        await screen.findByText('user.updated');
        await userEvent.click(screen.getByRole('button', { name: /Rentang waktu/ }));
        await userEvent.click(await screen.findByRole('button', { name: 'Semua waktu' }));

        await waitFor(() => expect(lastRequest().has('date_from')).toBe(false));
        expect(lastRequest().has('date_to')).toBe(false);
    });

    it('applies a range picked on the calendar in either order', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs');
        await screen.findByText('user.updated');
        await userEvent.click(screen.getByRole('button', { name: /Rentang waktu/ }));

        const day = (label: string) =>
            screen.getByRole('button', { name: new RegExp(`, ${label}`) });
        await screen.findByRole('grid', { name: 'November 2026' });
        expect(day('11 November 2026')).toBeDisabled();

        // The open calendar shows today as the range in use, so the first click starts anew.
        await userEvent.click(day('7 November 2026'));
        expect(screen.getByText('Pilih tanggal akhir')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Terapkan rentang' })).toBeDisabled();

        await userEvent.click(day('5 November 2026'));
        expect(screen.getByText('5 Nov 2026 sampai 7 Nov 2026')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'Terapkan rentang' }));

        await waitFor(() =>
            expect(lastRequest().get('date_from')).toBe('2026-11-05T00:00:00+07:00'),
        );
        expect(lastRequest().get('date_to')).toBe('2026-11-07T23:59:59+07:00');
        expect(
            screen.getByRole('button', { name: 'Rentang waktu: 5 Nov 2026 sampai 7 Nov 2026' }),
        ).toBeVisible();
    });

    it('filters by the user from the link and clears it', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp(`/audit-logs?user_id=${ACTOR_ID}&period=all`);

        // The name comes from the loaded rows, so it replaces the placeholder once they arrive.
        await waitFor(() =>
            expect(screen.getByText(/Aktivitas oleh/)).toHaveTextContent(
                'Aktivitas oleh Budi Santoso',
            ),
        );
        expect(lastRequest().get('user_id')).toBe(ACTOR_ID);

        await userEvent.click(screen.getByRole('button', { name: 'Hapus filter pengguna' }));

        await waitFor(() => expect(lastRequest().get('user_id')).toBeNull());
        expect(screen.queryByText(/Aktivitas oleh/)).not.toBeInTheDocument();
    });

    it('clears every filter back to today', async () => {
        asUser();
        serveList([]);

        renderApp('/audit-logs?module=auth&period=30d&search=login');

        expect(await screen.findByText('Tidak ada aktivitas yang cocok')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'Hapus semua filter' }));

        await waitFor(() => {
            const params = lastRequest();
            expect([params.get('module'), params.get('search'), params.get('date_from')]).toEqual([
                null,
                null,
                '2026-11-10T00:00:00+07:00',
            ]);
        });
        expect(await screen.findByText('Belum ada aktivitas hari ini')).toBeVisible();
        expect(
            screen.queryByRole('button', { name: 'Hapus semua filter' }),
        ).not.toBeInTheDocument();
    });

    it('opens the detail when a row is clicked', async () => {
        asUser();
        serveList([makeLog()]);
        serveDetail(makeLog());

        renderApp('/audit-logs');
        await userEvent.click(await screen.findByText('budi@example.com'));

        expect(
            await screen.findByRole('heading', { name: 'Memperbarui data pengguna' }),
        ).toBeVisible();
    });

    it('shows an error with a retry', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/audit-logs', () =>
                HttpResponse.json(
                    { success: false, message: '', code: 'SYSTEM_INTERNAL_ERROR', errors: null },
                    { status: 500 },
                ),
            ),
        );

        renderApp('/audit-logs');

        expect(await screen.findByText('Audit log tidak dapat dimuat')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
    });

    it('denies access without the audit permission', async () => {
        asUser(['user.view']);

        renderApp('/audit-logs');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });
});

describe('audit log detail', () => {
    it('shows the changes, the request origin, and links to related pages', async () => {
        asUser();
        serveDetail(makeLog());

        renderApp('/audit-logs/41');

        expect(
            await screen.findByRole('heading', { name: 'Memperbarui data pengguna' }),
        ).toBeVisible();
        expect(screen.getByRole('link', { name: 'Budi Santoso' })).toHaveAttribute(
            'href',
            `/users/${ACTOR_ID}`,
        );
        expect(screen.getByRole('link', { name: 'Sari Dewi' })).toHaveAttribute(
            'href',
            '/users/01932f5e-0000-7000-8000-000000000002',
        );
        expect(
            screen.getByRole('link', { name: 'Lihat semua aktivitas pengguna ini' }),
        ).toHaveAttribute('href', `/audit-logs?user_id=${ACTOR_ID}&period=all`);

        const changes = screen.getByRole('heading', { name: 'Detail perubahan' })
            .parentElement as HTMLElement;
        expect(within(changes).getByText('old')).toBeVisible();
        expect(within(changes).getByText(/"name": "Sari Dewi"/)).toBeVisible();
        expect(within(changes).queryByText('context')).not.toBeInTheDocument();

        const origin = screen.getByRole('heading', { name: 'Asal permintaan' })
            .parentElement as HTMLElement;
        expect(within(origin).getByText('10.0.0.5')).toBeVisible();
        expect(within(origin).getByText('Firefox')).toBeVisible();
        expect(within(origin).queryByText('ID permintaan')).not.toBeInTheDocument();
    });

    it('does not link to pages the viewer cannot open', async () => {
        asUser(['audit.view']);
        serveDetail(makeLog());

        renderApp('/audit-logs/41');

        expect(await screen.findByText('Budi Santoso')).toBeVisible();
        expect(screen.queryByRole('link', { name: 'Budi Santoso' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Sari Dewi' })).not.toBeInTheDocument();
    });

    it('says when a record has no extra data', async () => {
        asUser();
        serveDetail(
            makeLog({
                event: 'auth.logout',
                event_label: 'keluar dari aplikasi',
                subject: null,
                properties: { context: { ip_address: '10.0.0.5' } },
            }),
        );

        renderApp('/audit-logs/41');

        expect(
            await screen.findByText('Aktivitas ini tidak mencatat data tambahan.'),
        ).toBeVisible();
    });

    it('explains a record that is missing or outside the access and links back to the list', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/audit-logs/99', () =>
                HttpResponse.json(
                    { success: false, message: '', code: 'RESOURCE_NOT_FOUND', errors: null },
                    { status: 404 },
                ),
            ),
        );

        renderApp('/audit-logs/99');

        expect(await screen.findByText('Aktivitas tidak ditemukan')).toBeVisible();
        expect(screen.getByRole('link', { name: 'Kembali ke audit log' })).toHaveAttribute(
            'href',
            '/audit-logs',
        );
    });
});

describe('user detail', () => {
    it('links to the activity of the user for viewers with audit access', async () => {
        asUser(['audit.view', 'user.view']);
        server.use(
            http.get('*/api/v1/users/:id', () =>
                HttpResponse.json({
                    success: true,
                    message: '',
                    data: {
                        id: ACTOR_ID,
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

        renderApp(`/users/${ACTOR_ID}`);

        expect(await screen.findByRole('link', { name: 'Lihat aktivitas' })).toHaveAttribute(
            'href',
            `/audit-logs?user_id=${ACTOR_ID}&period=all`,
        );
    });
});
