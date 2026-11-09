import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';

const TILE_LABEL = { selector: '[data-slot="card"] > span:first-child' };
const ALL_PERMISSIONS = ['user.view', 'department.view', 'role.view', 'audit.view'];

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

const page = (data: unknown[], total: number) =>
    HttpResponse.json({
        success: true,
        message: '',
        data,
        meta: { pagination: { current_page: 1, per_page: 1, total, last_page: 1, from: 1, to: 1 } },
    });

function serveAll() {
    server.use(
        http.get('*/api/v1/users', () => page([], 1280)),
        http.get('*/api/v1/departments', () => page([], 12)),
        http.get('*/api/v1/roles', () => page([], 4)),
        http.get('*/api/v1/audit-logs', ({ request }) =>
            new URL(request.url).searchParams.get('per_page') === '1'
                ? page([], 37)
                : page(
                      [
                          {
                              id: 1,
                              event: 'user.deactivated',
                              actor: { id: 'a', name: 'Rina Hartono', email: 'r@example.com' },
                              subject: null,
                              properties: null,
                              created_at: '2026-11-09T03:00:00Z',
                          },
                          {
                              id: 2,
                              event: 'module.unknown',
                              actor: null,
                              subject: null,
                              properties: null,
                              created_at: null,
                          },
                      ],
                      2,
                  ),
        ),
    );
}

async function tileValue(label: string): Promise<string | null | undefined> {
    const tile = (await screen.findByText(label, TILE_LABEL)).parentElement as HTMLElement;

    await waitFor(() => expect(within(tile).queryByRole('status')).not.toBeInTheDocument());

    return tile.lastElementChild?.textContent;
}

it('shows record totals from the backend', async () => {
    asUser(ALL_PERMISSIONS);
    serveAll();

    renderApp('/');

    expect(await tileValue('Pengguna aktif')).toBe('1.280');
    expect(await tileValue('Departemen')).toBe('12');
    expect(await tileValue('Role')).toBe('4');
    expect(await tileValue('Aktivitas 7 hari terakhir')).toBe('37');
});

it('counts only active users and asks for one row', async () => {
    asUser(['user.view']);
    let params: URLSearchParams | undefined;
    server.use(
        http.get('*/api/v1/users', ({ request }) => {
            params = new URL(request.url).searchParams;

            return page([], 3);
        }),
    );

    renderApp('/');

    expect(await tileValue('Pengguna aktif')).toBe('3');
    expect(params?.get('status')).toBe('active');
    expect(params?.get('per_page')).toBe('1');
});

it('requests and shows nothing the user may not view', async () => {
    asUser(['department.view']);
    server.use(http.get('*/api/v1/departments', () => page([], 12)));

    renderApp('/');

    expect(await tileValue('Departemen')).toBe('12');
    expect(screen.queryByText('Pengguna aktif', TILE_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText('Role', TILE_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText('Aktivitas terbaru')).not.toBeInTheDocument();
});

it('describes recent activity in Indonesian, also for an unknown event', async () => {
    asUser(['audit.view']);
    serveAll();

    renderApp('/');

    expect(await screen.findByText('Rina Hartono')).toBeVisible();
    expect(screen.getByText(/menonaktifkan pengguna/)).toBeVisible();
    expect(screen.getByText('Akun tidak dikenal')).toBeVisible();
    expect(screen.getByText(/melakukan perubahan/)).toBeVisible();
    expect(screen.queryByText(/module\.unknown/)).not.toBeInTheDocument();
});

it('asks for the newest activity first', async () => {
    asUser(['audit.view']);
    const requests: URLSearchParams[] = [];
    server.use(
        http.get('*/api/v1/audit-logs', ({ request }) => {
            requests.push(new URL(request.url).searchParams);

            return page([], 0);
        }),
    );

    renderApp('/');

    await screen.findByText('Belum ada aktivitas yang tercatat');
    const list = requests.find((params) => params.get('per_page') === '5');
    expect(list?.get('sort_by')).toBe('created_at');
    expect(list?.get('sort_direction')).toBe('desc');
});

it('shows skeletons while loading', async () => {
    asUser(['audit.view']);
    server.use(
        http.get('*/api/v1/audit-logs', async () => {
            await delay(100);

            return page([], 0);
        }),
    );

    renderApp('/');

    expect(await screen.findByRole('status', { name: 'Memuat aktivitas terbaru' })).toBeVisible();
    expect(screen.getByRole('status', { name: 'Memuat Aktivitas 7 hari terakhir' })).toBeVisible();
    await screen.findByText('Belum ada aktivitas yang tercatat');
});

it('keeps other tiles working and retries the one that failed', async () => {
    asUser(['user.view', 'department.view']);
    let attempts = 0;
    server.use(
        http.get('*/api/v1/departments', () => page([], 12)),
        http.get('*/api/v1/users', () => {
            attempts += 1;

            return attempts === 1
                ? HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 })
                : page([], 7);
        }),
    );

    renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Muat ulang Pengguna aktif' }));

    expect(await tileValue('Pengguna aktif')).toBe('7');
    expect(await tileValue('Departemen')).toBe('12');
});

it('explains when recent activity cannot be loaded', async () => {
    asUser(['audit.view']);
    server.use(
        http.get('*/api/v1/audit-logs', () =>
            HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 }),
        ),
    );

    renderApp('/');

    expect(await screen.findByText('Aktivitas terbaru belum dapat dimuat')).toBeVisible();
});
