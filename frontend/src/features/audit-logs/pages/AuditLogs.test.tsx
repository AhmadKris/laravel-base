import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { AuditLog } from '@/types/api-response';

const ACTOR_ID = '01932f5e-0000-7000-8000-000000000001';

function makeLog(overrides: Partial<AuditLog> = {}): AuditLog {
    return {
        id: 41,
        event: 'user.updated',
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
});

describe('audit log list', () => {
    it('shows when, what, who, and on which object', async () => {
        asUser();
        serveList([
            makeLog(),
            makeLog({ id: 42, event: 'auth.login_failed', actor: null, subject: null }),
            makeLog({
                id: 43,
                event: 'role.deleted',
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

    it('sends the module, dates, search, and sorting to the API', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs');
        await screen.findByText('user.updated');

        await userEvent.click(screen.getByRole('combobox', { name: 'Filter modul' }));
        await userEvent.click(await screen.findByRole('option', { name: 'Pengguna' }));
        await waitFor(() => expect(lastRequest().get('module')).toBe('user'));

        await userEvent.type(screen.getByLabelText('Dari tanggal (UTC)'), '2026-11-01');
        await userEvent.type(screen.getByLabelText('Sampai tanggal (UTC)'), '2026-11-03');
        await waitFor(() => expect(lastRequest().get('date_to')).toBe('2026-11-03'));
        expect(lastRequest().get('date_from')).toBe('2026-11-01');

        await userEvent.type(
            screen.getByRole('searchbox', { name: 'Cari nama aktivitas' }),
            'updated',
        );
        await waitFor(() => expect(lastRequest().get('search')).toBe('updated'));

        await userEvent.click(screen.getByRole('button', { name: /Waktu/ }));
        await waitFor(() => expect(lastRequest().get('sort_by')).toBe('created_at'));
    });

    it('does not ask the API for a date range that ends before it starts', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp('/audit-logs?date_from=2026-11-05&date_to=2026-11-01');

        expect(
            await screen.findByText('Tanggal akhir tidak boleh lebih awal dari tanggal mulai.'),
        ).toBeVisible();
        expect(screen.getByLabelText('Sampai tanggal (UTC)')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(requests).toEqual([]);
    });

    it('filters by the user from the link and clears it', async () => {
        asUser();
        serveList([makeLog()]);

        renderApp(`/audit-logs?user_id=${ACTOR_ID}`);

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

    it('clears every filter at once', async () => {
        asUser();
        serveList([]);

        renderApp('/audit-logs?module=auth&date_from=2026-11-01&search=login');

        expect(await screen.findByText('Tidak ada aktivitas yang cocok')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'Hapus semua filter' }));

        await waitFor(() => {
            const params = lastRequest();
            expect([params.get('module'), params.get('date_from'), params.get('search')]).toEqual([
                null,
                null,
                null,
            ]);
        });
        expect(await screen.findByText('Belum ada aktivitas')).toBeVisible();
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
        ).toHaveAttribute('href', `/audit-logs?user_id=${ACTOR_ID}`);

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
                subject: null,
                properties: { context: { ip_address: '10.0.0.5' } },
            }),
        );

        renderApp('/audit-logs/41');

        expect(
            await screen.findByText('Aktivitas ini tidak mencatat data tambahan.'),
        ).toBeVisible();
    });

    it('explains a record that is missing or outside the access', async () => {
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
            `/audit-logs?user_id=${ACTOR_ID}`,
        );
    });
});
