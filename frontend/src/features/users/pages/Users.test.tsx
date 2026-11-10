import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { Role, User } from '@/types/api-response';

const ALL = [
    'user.view',
    'user.create',
    'user.update',
    'user.delete',
    'user.assign_role',
    'role.view',
];
const CURRENT_USER_ID = makeUser().id;

function makeTarget(overrides: Partial<User> = {}): User {
    return {
        id: 'user-1',
        name: 'Budi Santoso',
        email: 'budi@example.com',
        username: 'budi.santoso',
        status: 'active',
        roles: ['Staff'],
        created_at: '2026-11-01T03:00:00Z',
        ...overrides,
    };
}

function makeRole(id: number, name: string): Role {
    return { id, name, is_protected: false, users_count: 0, version: 1, created_at: null };
}

function asUser(permissions: string[] = ALL) {
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

const page = <T,>(rows: T[], overrides: Record<string, number> = {}) =>
    HttpResponse.json({
        success: true,
        message: '',
        data: rows,
        meta: {
            pagination: {
                current_page: 1,
                per_page: 20,
                total: rows.length,
                last_page: 1,
                from: rows.length ? 1 : null,
                to: rows.length ? rows.length : null,
                ...overrides,
            },
        },
    });

const one = (user: User, status = 200) =>
    HttpResponse.json({ success: true, message: '', data: user, meta: null }, { status });

function serveList(rows: User[]) {
    server.use(http.get('*/api/v1/users', () => page(rows)));
}

function serveDetail(user: User) {
    server.use(http.get(`*/api/v1/users/${user.id}`, () => one(user)));
}

function serveRoles(names: string[] = ['Admin', 'Staff', 'Viewer']) {
    server.use(
        http.get('*/api/v1/roles', () => page(names.map((name, index) => makeRole(index, name)))),
    );
}

function recordListRequests(rows: User[]) {
    const requests: URLSearchParams[] = [];
    server.use(
        http.get('*/api/v1/users', ({ request }) => {
            requests.push(new URL(request.url).searchParams);

            return page(rows);
        }),
    );

    return requests;
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

describe('user list', () => {
    it('shows name, email, username, role, and status', async () => {
        asUser();
        serveList([
            makeTarget(),
            makeTarget({
                id: 'user-2',
                name: 'Citra',
                username: null,
                roles: [],
                status: 'inactive',
            }),
        ]);

        renderApp('/users');

        const row = (await screen.findByRole('link', { name: 'Budi Santoso' })).closest('tr');
        expect(row).toHaveTextContent('budi@example.com');
        expect(row).toHaveTextContent('budi.santoso');
        expect(row).toHaveTextContent('Staff');
        expect(row).toHaveTextContent('Aktif');
        expect(screen.getByRole('link', { name: 'Citra' }).closest('tr')).toHaveTextContent(
            'Nonaktif',
        );
        expect(document.title).toBe('Pengguna - Enterprise System');
    });

    it('searches after typing stops and resets to the first page', async () => {
        asUser();
        const requests = recordListRequests([makeTarget()]);

        const router = renderApp('/users?page=3');
        await screen.findByRole('link', { name: 'Budi Santoso' });
        await userEvent.type(screen.getByRole('searchbox'), 'bud');

        await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('bud'));
        expect(requests.filter((params) => params.get('search') === 'bu')).toHaveLength(0);
        expect(router.state.location.search).toBe('?search=bud');
    });

    it('filters by status', async () => {
        asUser();
        const requests = recordListRequests([makeTarget()]);

        renderApp('/users');
        await screen.findByRole('link', { name: 'Budi Santoso' });
        await userEvent.click(screen.getByRole('combobox', { name: 'Filter status' }));
        await userEvent.click(await screen.findByRole('option', { name: 'Nonaktif' }));

        await waitFor(() => expect(requests.at(-1)?.get('status')).toBe('inactive'));
    });

    it('clears a status-only filter without reverting after the search delay', async () => {
        asUser();
        const requests = recordListRequests([makeTarget()]);

        const router = renderApp('/users');
        await screen.findByRole('link', { name: 'Budi Santoso' });
        await userEvent.click(screen.getByRole('combobox', { name: 'Filter status' }));
        await userEvent.click(await screen.findByRole('option', { name: 'Nonaktif' }));
        await waitFor(() => expect(router.state.location.search).toBe('?status=inactive'));

        await userEvent.click(screen.getByRole('button', { name: 'Hapus filter' }));
        await waitFor(() => expect(router.state.location.search).toBe(''));

        await new Promise((resolve) => window.setTimeout(resolve, 400));

        expect(router.state.location.search).toBe('');
        expect(screen.getByRole('combobox', { name: 'Filter status' })).toHaveTextContent(
            'Semua status',
        );
        expect(requests.at(-1)?.has('status')).toBe(false);
    });

    it('sorts through the column header', async () => {
        asUser();
        const requests = recordListRequests([makeTarget()]);

        renderApp('/users');
        await screen.findByRole('link', { name: 'Budi Santoso' });
        await userEvent.click(screen.getByRole('button', { name: 'Dibuat' }));

        await waitFor(() => expect(requests.at(-1)?.get('sort_by')).toBe('created_at'));
        expect(requests.at(-1)?.get('sort_direction')).toBe('asc');

        await userEvent.click(screen.getByRole('button', { name: 'Nama' }));

        await waitFor(() => expect(requests.at(-1)?.get('sort_by')).toBe('name'));
    });

    it('requests the next page', async () => {
        asUser();
        const requests: URLSearchParams[] = [];
        server.use(
            http.get('*/api/v1/users', ({ request }) => {
                requests.push(new URL(request.url).searchParams);

                return page([makeTarget()], { total: 45, last_page: 3, to: 20 });
            }),
        );

        renderApp('/users');
        await screen.findByRole('link', { name: 'Budi Santoso' });
        await userEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));

        await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('2'));
    });

    it('changes the page size and returns to the first page', async () => {
        asUser();
        const requests = recordListRequests([makeTarget()]);

        const router = renderApp('/users?page=3');
        await screen.findByRole('link', { name: 'Budi Santoso' });
        await userEvent.click(screen.getByRole('combobox', { name: 'Jumlah data per halaman' }));
        await userEvent.click(await screen.findByRole('option', { name: '50 per halaman' }));

        await waitFor(() => expect(requests.at(-1)?.get('per_page')).toBe('50'));
        expect(requests.at(-1)?.get('page')).toBe('1');
        expect(router.state.location.search).toBe('?per_page=50');
    });

    it('asks for 10 rows unless another offered size is chosen', async () => {
        asUser();
        const requests = recordListRequests([makeTarget()]);

        renderApp('/users?per_page=500');
        await screen.findByRole('link', { name: 'Budi Santoso' });

        expect(requests.at(-1)?.get('per_page')).toBe('10');
    });

    it('opens the detail page when a row is clicked', async () => {
        asUser(['user.view']);
        serveList([makeTarget()]);
        serveDetail(makeTarget());

        const router = renderApp('/users');
        await userEvent.click(await screen.findByRole('cell', { name: 'budi.santoso' }));

        await screen.findByRole('heading', { name: 'Budi Santoso' });
        expect(router.state.location.pathname).toBe('/users/user-1');
    });

    it('stays on the list when using the row menu', async () => {
        asUser();
        serveList([makeTarget()]);

        const router = renderApp('/users');
        await userEvent.click(
            await screen.findByRole('button', { name: 'Aksi untuk Budi Santoso' }),
        );
        await userEvent.click(
            await screen.findByRole('menuitem', { name: 'Nonaktifkan pengguna' }),
        );
        await screen.findByRole('alertdialog');

        expect(router.state.location.pathname).toBe('/users');
    });

    it('moves back when the current page no longer exists', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/users', ({ request }) =>
                new URL(request.url).searchParams.get('page') === '4'
                    ? page<User>([], { total: 41, last_page: 3 })
                    : page([makeTarget()], { total: 41, last_page: 3, current_page: 3 }),
            ),
        );

        const router = renderApp('/users?page=4');

        await screen.findByRole('link', { name: 'Budi Santoso' });
        expect(router.state.location.search).toBe('?page=3');
    });

    it('explains an empty result and resets filters', async () => {
        asUser();
        const requests = recordListRequests([]);

        renderApp('/users?search=zzz');

        expect(await screen.findByText('Tidak ada pengguna yang cocok')).toBeVisible();
        expect(screen.getByRole('searchbox')).toHaveValue('zzz');

        await userEvent.click(screen.getByRole('button', { name: 'Reset filter' }));

        await waitFor(() => expect(requests.at(-1)?.has('search')).toBe(false));
        expect(screen.getByRole('searchbox')).toHaveValue('');
    });

    it('explains an empty module and offers a create action', async () => {
        asUser();
        serveList([]);

        renderApp('/users');

        expect(await screen.findByText('Belum ada pengguna')).toBeVisible();
        expect(screen.getAllByRole('link', { name: 'Tambah pengguna' })).toHaveLength(2);
    });

    it('explains a loading failure', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/users', () =>
                HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 }),
            ),
        );

        renderApp('/users');

        expect(await screen.findByText('Daftar pengguna tidak dapat dimuat')).toBeVisible();
    });

    it('offers no actions to a read-only user', async () => {
        asUser(['user.view']);
        serveList([makeTarget()]);

        renderApp('/users');

        await screen.findByRole('link', { name: 'Budi Santoso' });
        expect(screen.queryByRole('link', { name: 'Tambah pengguna' })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Aksi untuk Budi Santoso' }),
        ).not.toBeInTheDocument();
    });

    it('offers edit without deactivation for an update-only user', async () => {
        asUser(['user.view', 'user.update']);
        serveList([makeTarget()]);

        renderApp('/users');
        await userEvent.click(
            await screen.findByRole('button', { name: 'Aksi untuk Budi Santoso' }),
        );

        expect(await screen.findByRole('menuitem', { name: 'Ubah pengguna' })).toBeVisible();
        expect(
            screen.queryByRole('menuitem', { name: 'Nonaktifkan pengguna' }),
        ).not.toBeInTheDocument();
    });

    it('does not offer deactivating the own account', async () => {
        asUser();
        serveList([makeTarget({ id: CURRENT_USER_ID, name: 'Saya' })]);

        renderApp('/users');
        await userEvent.click(await screen.findByRole('button', { name: 'Aksi untuk Saya' }));

        await screen.findByRole('menuitem', { name: 'Ubah pengguna' });
        expect(
            screen.queryByRole('menuitem', { name: 'Nonaktifkan pengguna' }),
        ).not.toBeInTheDocument();
    });

    it('blocks a user without view permission', async () => {
        asUser([]);

        renderApp('/users');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });
});

describe('changing user status', () => {
    async function openFromList(item: string) {
        await userEvent.click(
            await screen.findByRole('button', { name: 'Aksi untuk Budi Santoso' }),
        );
        await userEvent.click(await screen.findByRole('menuitem', { name: item }));

        return screen.findByRole('alertdialog');
    }

    it('names the user and deactivates only after confirmation', async () => {
        asUser();
        const removed: string[] = [];
        let rows = [makeTarget()];
        server.use(
            http.get('*/api/v1/users', () => page(rows)),
            http.delete('*/api/v1/users/:id', ({ params }) => {
                removed.push(String(params.id));
                rows = [makeTarget({ status: 'inactive' })];

                return new HttpResponse(null, { status: 204 });
            }),
        );

        renderApp('/users');
        const dialog = await openFromList('Nonaktifkan pengguna');

        expect(dialog).toHaveAccessibleName('Nonaktifkan pengguna Budi Santoso?');
        expect(dialog).toHaveAccessibleDescription(/budi@example.com/);
        expect(removed).toEqual([]);

        await userEvent.click(within(dialog).getByRole('button', { name: 'Nonaktifkan pengguna' }));

        expect(await screen.findByText('Pengguna Budi Santoso telah dinonaktifkan.')).toBeVisible();
        expect(removed).toEqual(['user-1']);
        await waitFor(() =>
            expect(
                screen.getByRole('link', { name: 'Budi Santoso' }).closest('tr'),
            ).toHaveTextContent('Nonaktif'),
        );
    });

    it('reactivates through PATCH', async () => {
        asUser();
        let body: unknown;
        serveList([makeTarget({ status: 'inactive' })]);
        server.use(
            http.patch('*/api/v1/users/user-1', async ({ request }) => {
                body = await request.json();

                return one(makeTarget());
            }),
        );

        renderApp('/users');
        const dialog = await openFromList('Aktifkan pengguna');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Aktifkan pengguna' }));

        expect(
            await screen.findByText('Pengguna Budi Santoso telah diaktifkan kembali.'),
        ).toBeVisible();
        expect(body).toEqual({ status: 'active' });
    });

    it('explains a refusal inside the dialog and keeps it open', async () => {
        asUser();
        serveList([makeTarget()]);
        server.use(
            http.delete('*/api/v1/users/:id', () =>
                HttpResponse.json({ code: 'USER_LAST_SUPER_ADMIN' }, { status: 409 }),
            ),
        );

        renderApp('/users');
        const dialog = await openFromList('Nonaktifkan pengguna');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Nonaktifkan pengguna' }));

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            'Super Admin aktif terakhir tidak dapat dinonaktifkan.',
        );
        expect(screen.getByRole('alertdialog')).toBeVisible();
    });

    it('sends nothing when cancelled', async () => {
        asUser();
        serveList([makeTarget()]);

        renderApp('/users');
        const dialog = await openFromList('Nonaktifkan pengguna');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));

        await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });
});

describe('user detail', () => {
    it('shows the fields', async () => {
        asUser(['user.view']);
        serveDetail(makeTarget());

        renderApp('/users/user-1');

        expect(await screen.findByRole('heading', { name: 'Budi Santoso' })).toBeVisible();
        expect(screen.getByText('budi@example.com')).toBeVisible();
        expect(screen.getByText('budi.santoso')).toBeVisible();
        expect(screen.getByText('Staff')).toBeVisible();
    });

    it('hides actions the user may not perform', async () => {
        asUser(['user.view']);
        serveDetail(makeTarget());

        renderApp('/users/user-1');

        await screen.findByRole('heading', { name: 'Budi Santoso' });
        expect(screen.queryByRole('link', { name: 'Ubah pengguna' })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Nonaktifkan pengguna' }),
        ).not.toBeInTheDocument();
    });

    it('does not offer deactivating the own account', async () => {
        asUser();
        serveRoles();
        serveDetail(makeTarget({ id: CURRENT_USER_ID, name: 'Saya' }));

        renderApp(`/users/${CURRENT_USER_ID}`);

        await screen.findByRole('heading', { name: 'Saya' });
        expect(
            screen.queryByRole('button', { name: 'Nonaktifkan pengguna' }),
        ).not.toBeInTheDocument();
    });

    it('treats a user outside the scope as not found and links back to the list', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/users/user-x', () =>
                HttpResponse.json({ code: 'RESOURCE_NOT_FOUND' }, { status: 404 }),
            ),
        );

        renderApp('/users/user-x');

        expect(await screen.findByText('Pengguna tidak ditemukan')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Coba lagi' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Kembali ke daftar pengguna' })).toHaveAttribute(
            'href',
            '/users',
        );
    });

    it('offers a retry for other failures', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/users/user-x', () =>
                HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 }),
            ),
        );

        renderApp('/users/user-x');

        expect(await screen.findByText('Detail pengguna tidak dapat dimuat')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
    });
});

describe('user form', () => {
    beforeEach(() => serveRoles());

    async function fillNewUser(password = 'password-awal-yang-panjang') {
        await userEvent.type(await screen.findByLabelText('Nama'), 'Dewi');
        await userEvent.type(screen.getByLabelText('Email'), 'dewi@example.com');
        await userEvent.type(screen.getByLabelText('Password awal'), password);
    }

    it('creates a user without a username and opens the detail page', async () => {
        asUser();
        let body: unknown;
        const created = makeTarget({ id: 'user-new', name: 'Dewi' });
        serveDetail(created);
        serveRoles();
        server.use(
            http.post('*/api/v1/users', async ({ request }) => {
                body = await request.json();

                return one(created, 201);
            }),
        );

        const router = renderApp('/users/new');
        await fillNewUser();
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        await screen.findByRole('heading', { name: 'Dewi' });
        expect(router.state.location.pathname).toBe('/users/user-new');
        expect(screen.getByText('Pengguna Dewi telah disimpan.')).toBeVisible();
        expect(body).toEqual({
            name: 'Dewi',
            email: 'dewi@example.com',
            username: null,
            password: 'password-awal-yang-panjang',
        });
    });

    it('asks before leaving a form with unsaved changes', async () => {
        asUser();
        serveList([makeTarget()]);

        const router = renderApp('/users/new');
        await userEvent.type(await screen.findByLabelText('Nama'), 'Dewi');
        expect(screen.getByText('Ada perubahan belum disimpan')).toBeVisible();
        await userEvent.click(
            within(screen.getByRole('navigation', { name: 'Menu utama' })).getByRole('link', {
                name: 'Pengguna',
            }),
        );

        const dialog = await screen.findByRole('alertdialog', { name: 'Tinggalkan halaman ini?' });
        await userEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));

        expect(router.state.location.pathname).toBe('/users/new');
        expect(screen.getByLabelText('Nama')).toHaveValue('Dewi');

        await userEvent.click(
            within(screen.getByRole('navigation', { name: 'Menu utama' })).getByRole('link', {
                name: 'Pengguna',
            }),
        );
        await userEvent.click(
            within(
                await screen.findByRole('alertdialog', { name: 'Tinggalkan halaman ini?' }),
            ).getByRole('button', { name: 'Tinggalkan halaman' }),
        );

        await waitFor(() => expect(router.state.location.pathname).toBe('/users'));
    });

    it('leaves an untouched form without asking', async () => {
        asUser();
        serveList([makeTarget()]);

        const router = renderApp('/users/new');
        await screen.findByLabelText('Nama');
        await userEvent.click(
            within(screen.getByRole('navigation', { name: 'Menu utama' })).getByRole('link', {
                name: 'Pengguna',
            }),
        );

        await waitFor(() => expect(router.state.location.pathname).toBe('/users'));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('validates required fields, username, and password before calling the server', async () => {
        asUser();

        renderApp('/users/new');
        await userEvent.type(await screen.findByLabelText('Username (opsional)'), 'a@');
        await userEvent.type(screen.getByLabelText('Password awal'), 'pendek');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        expect(await screen.findByText('Nama wajib diisi.')).toBeVisible();
        expect(screen.getByText('Masukkan alamat email yang valid.')).toBeVisible();
        expect(screen.getByText(/Username hanya boleh berisi/)).toBeVisible();
        expect(screen.getByText('Password minimal 12 karakter.')).toBeVisible();
    });

    it('requires at least three characters when a username is given', async () => {
        asUser();

        renderApp('/users/new');
        await userEvent.type(await screen.findByLabelText('Username (opsional)'), 'ab');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        expect(await screen.findByText('Username minimal 3 karakter.')).toBeVisible();
    });

    it('shows backend errors on their fields', async () => {
        asUser();
        server.use(
            http.post('*/api/v1/users', () =>
                HttpResponse.json(
                    { code: 'VALIDATION_FAILED', errors: { email: ['Email sudah digunakan.'] } },
                    { status: 422 },
                ),
            ),
        );

        renderApp('/users/new');
        await fillNewUser();
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        expect(await screen.findByText('Email sudah digunakan.')).toBeVisible();
        expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    });

    it('fills the form when editing, hides the password, and saves with PATCH', async () => {
        asUser();
        let body: unknown;
        const user = makeTarget();
        serveDetail(user);
        serveRoles();
        server.use(
            http.patch('*/api/v1/users/user-1', async ({ request }) => {
                body = await request.json();

                return one({ ...user, name: 'Budi Baru' });
            }),
        );

        renderApp('/users/user-1/edit');
        const name = await screen.findByLabelText('Nama');
        expect(screen.getByLabelText('Email')).toHaveValue('budi@example.com');
        expect(screen.getByLabelText('Username (opsional)')).toHaveValue('budi.santoso');
        expect(screen.queryByLabelText('Password awal')).not.toBeInTheDocument();
        await userEvent.clear(name);
        await userEvent.type(name, 'Budi Baru');
        await userEvent.clear(screen.getByLabelText('Username (opsional)'));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        await screen.findByText('Pengguna Budi Baru telah disimpan.');
        expect(body).toEqual({ name: 'Budi Baru', email: 'budi@example.com', username: null });
    });

    it('refreshes the account menu after editing the own account', async () => {
        asUser();
        const self = makeTarget({
            id: CURRENT_USER_ID,
            name: 'Ani Lestari',
            email: 'ani@example.com',
        });
        serveDetail(self);
        serveRoles();
        server.use(
            http.patch(`*/api/v1/users/${CURRENT_USER_ID}`, () =>
                one({ ...self, name: 'Ani Baru' }),
            ),
        );

        renderApp(`/users/${CURRENT_USER_ID}/edit`);
        const name = await screen.findByLabelText('Nama');
        await userEvent.clear(name);
        await userEvent.type(name, 'Ani Baru');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        await waitFor(() => expect(useAuthStore.getState().user?.name).toBe('Ani Baru'));
    });

    it('creates a user with the selected roles', async () => {
        asUser();
        let body: Record<string, unknown> = {};
        const created = makeTarget({ id: 'user-new', name: 'Dewi' });
        serveDetail(created);
        server.use(
            http.post('*/api/v1/users', async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;

                return one(created, 201);
            }),
        );

        renderApp('/users/new');
        await fillNewUser();
        await userEvent.click(await screen.findByRole('checkbox', { name: 'Staff' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Viewer' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        await screen.findByRole('heading', { name: 'Dewi' });
        expect(body.roles).toEqual(['Staff', 'Viewer']);
    });

    it('shows the current roles when editing and sends a changed set', async () => {
        asUser();
        let body: Record<string, unknown> = {};
        const user = makeTarget();
        serveDetail(user);
        server.use(
            http.patch('*/api/v1/users/user-1', async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;

                return one(user);
            }),
        );

        renderApp('/users/user-1/edit');
        const staff = await screen.findByRole('checkbox', { name: 'Staff' });
        expect(staff).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Admin' })).not.toBeChecked();

        await userEvent.click(staff);
        await userEvent.click(screen.getByRole('checkbox', { name: 'Viewer' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        await waitFor(() => expect(body.roles).toEqual(['Viewer']));
    });

    it('shows the saved data right away instead of the previous version', async () => {
        asUser();
        const user = makeTarget();
        // Only reads after the save hang, so the heading can come from the saved response alone.
        let saved = false;
        server.use(
            http.get('*/api/v1/users/user-1', async () => {
                if (saved) {
                    await delay('infinite');
                }

                return one(user);
            }),
            http.patch('*/api/v1/users/user-1', () => {
                saved = true;

                return one({ ...user, name: 'Nama Tersimpan' });
            }),
        );

        renderApp('/users/user-1/edit');
        const name = await screen.findByLabelText('Nama');
        await userEvent.clear(name);
        await userEvent.type(name, 'Nama Tersimpan');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        expect(await screen.findByRole('heading', { name: 'Nama Tersimpan' })).toBeVisible();
    });

    it('omits roles when they did not change', async () => {
        asUser();
        let body: Record<string, unknown> = { roles: 'unset' };
        const user = makeTarget();
        serveDetail(user);
        server.use(
            http.patch('*/api/v1/users/user-1', async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;

                return one(user);
            }),
        );

        renderApp('/users/user-1/edit');
        await screen.findByRole('checkbox', { name: 'Staff' });
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        await waitFor(() => expect(body.roles).toBeUndefined());
    });

    it('explains a refused role and stays on the form', async () => {
        asUser();
        const user = makeTarget();
        serveDetail(user);
        server.use(
            http.patch('*/api/v1/users/user-1', () =>
                HttpResponse.json({ code: 'AUTH_PRIVILEGE_ESCALATION' }, { status: 403 }),
            ),
        );

        const router = renderApp('/users/user-1/edit');
        await userEvent.click(await screen.findByRole('checkbox', { name: 'Admin' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengguna' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Anda tidak dapat memberikan akses melebihi kewenangan Anda.',
        );
        expect(router.state.location.pathname).toBe('/users/user-1/edit');
    });

    it('hides roles when editing the own account', async () => {
        asUser();
        serveDetail(makeTarget({ id: CURRENT_USER_ID, name: 'Saya' }));

        renderApp(`/users/${CURRENT_USER_ID}/edit`);

        await screen.findByLabelText('Nama');
        expect(screen.queryByRole('group', { name: 'Role' })).not.toBeInTheDocument();
    });

    it.each([
        ['assign', ['user.view', 'user.create', 'role.view']],
        ['role list', ['user.view', 'user.create', 'user.assign_role']],
    ])('hides roles without the %s permission', async (_name, permissions) => {
        asUser(permissions);
        let roleRequests = 0;
        server.use(
            http.get('*/api/v1/roles', () => {
                roleRequests += 1;

                return page([makeRole(1, 'Staff')]);
            }),
        );

        renderApp('/users/new');

        await screen.findByLabelText('Nama');
        expect(screen.queryByRole('group', { name: 'Role' })).not.toBeInTheDocument();
        expect(roleRequests).toBe(0);
    });

    it('explains when the role list cannot load and offers a retry', async () => {
        asUser();
        let attempts = 0;
        server.use(
            http.get('*/api/v1/roles', () => {
                attempts += 1;

                return attempts === 1
                    ? HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 })
                    : page([makeRole(1, 'Staff')]);
            }),
        );

        renderApp('/users/new');

        await screen.findByText('Daftar role tidak dapat dimuat.');
        await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

        expect(await screen.findByRole('checkbox', { name: 'Staff' })).toBeVisible();
    });

    it('blocks the form routes without permission', async () => {
        asUser(['user.view']);

        renderApp('/users/new');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });

    it('blocks the edit route without permission', async () => {
        asUser(['user.view']);

        renderApp('/users/user-1/edit');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });
});
