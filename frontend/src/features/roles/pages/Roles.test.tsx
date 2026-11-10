import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { Role } from '@/types/api-response';

const ALL = [
    'role.view',
    'role.create',
    'role.update',
    'role.delete',
    'permission.view',
    'permission.assign',
];

function makeRole(overrides: Partial<Role> = {}): Role {
    return {
        id: 7,
        name: 'Auditor',
        is_protected: false,
        users_count: 0,
        permissions: ['user.view'],
        version: 3,
        created_at: '2026-11-01T03:00:00Z',
        ...overrides,
    };
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

const page = (rows: Role[], overrides: Record<string, number> = {}) =>
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

const one = (role: Role, status = 200) =>
    HttpResponse.json({ success: true, message: '', data: role, meta: null }, { status });

function serveList(rows: Role[]) {
    server.use(http.get('*/api/v1/roles', () => page(rows)));
}

function serveDetail(role: Role) {
    server.use(http.get(`*/api/v1/roles/${role.id}`, () => one(role)));
}

function servePermissions(names = ['audit.view', 'user.create', 'user.view']) {
    server.use(
        http.get('*/api/v1/permissions', () =>
            HttpResponse.json({
                success: true,
                message: '',
                data: names.map((name, id) => ({ id, name })),
                meta: null,
            }),
        ),
    );
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

describe('role list', () => {
    it('shows name, type, user count', async () => {
        asUser();
        serveList([
            makeRole({ users_count: 4 }),
            makeRole({ id: 1, name: 'Staff', is_protected: true }),
        ]);

        renderApp('/roles');

        const row = (await screen.findByRole('link', { name: 'Auditor' })).closest('tr');
        expect(row).toHaveTextContent('Kustom');
        expect(row).toHaveTextContent('4');
        expect(screen.getByRole('link', { name: 'Staff' }).closest('tr')).toHaveTextContent(
            'Bawaan',
        );
        expect(document.title).toBe('Role - Enterprise System');
    });

    it('searches, sorts, and changes the page size through the API', async () => {
        asUser();
        const requests: URLSearchParams[] = [];
        server.use(
            http.get('*/api/v1/roles', ({ request }) => {
                requests.push(new URL(request.url).searchParams);

                return page([makeRole()]);
            }),
        );

        renderApp('/roles');
        await screen.findByRole('link', { name: 'Auditor' });

        await userEvent.type(screen.getByRole('searchbox'), 'aud');
        await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('aud'));

        await userEvent.click(screen.getByRole('button', { name: 'Nama' }));
        await waitFor(() => expect(requests.at(-1)?.get('sort_by')).toBe('name'));

        await userEvent.click(screen.getByRole('combobox', { name: 'Jumlah data per halaman' }));
        await userEvent.click(await screen.findByRole('option', { name: '50 per halaman' }));
        await waitFor(() => expect(requests.at(-1)?.get('per_page')).toBe('50'));
    });

    it('opens the detail page when a row is clicked', async () => {
        asUser(['role.view']);
        serveList([makeRole()]);
        serveDetail(makeRole());

        const router = renderApp('/roles');
        await userEvent.click(await screen.findByRole('cell', { name: 'Kustom' }));

        await screen.findByRole('heading', { name: 'Auditor' });
        expect(router.state.location.pathname).toBe('/roles/7');
    });

    it('explains empty and failed lists', async () => {
        asUser();
        serveList([]);

        renderApp('/roles?search=zzz');

        const emptyTitle = await screen.findByText('Tidak ada role yang cocok');
        expect(emptyTitle).toBeVisible();
        expect(screen.getAllByRole('button', { name: 'Hapus filter' })).toHaveLength(2);
        expect(
            within(emptyTitle.parentElement as HTMLElement).getByRole('button', {
                name: 'Hapus filter',
            }),
        ).toBeVisible();
    });

    it('explains a loading failure', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/roles', () =>
                HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 }),
            ),
        );

        renderApp('/roles');

        expect(await screen.findByText('Daftar role tidak dapat dimuat')).toBeVisible();
    });

    it('offers no actions to a read-only user', async () => {
        asUser(['role.view']);
        serveList([makeRole()]);

        renderApp('/roles');

        await screen.findByRole('link', { name: 'Auditor' });
        expect(screen.queryByRole('link', { name: 'Tambah role' })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Aksi untuk Auditor' }),
        ).not.toBeInTheDocument();
    });

    it('offers edit but not delete on a built-in role', async () => {
        asUser();
        serveList([makeRole({ id: 1, name: 'Staff', is_protected: true })]);

        renderApp('/roles');
        await userEvent.click(await screen.findByRole('button', { name: 'Aksi untuk Staff' }));

        expect(await screen.findByRole('menuitem', { name: 'Ubah role' })).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'Hapus role' })).not.toBeInTheDocument();
    });

    it('offers no actions on the super admin role', async () => {
        asUser();
        serveList([makeRole({ id: 1, name: 'Super Admin', is_protected: true })]);

        renderApp('/roles');

        await screen.findByRole('link', { name: 'Super Admin' });
        expect(
            screen.queryByRole('button', { name: 'Aksi untuk Super Admin' }),
        ).not.toBeInTheDocument();
    });

    it('blocks a user without view permission', async () => {
        asUser([]);

        renderApp('/roles');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });
});

describe('deleting a role', () => {
    async function openDelete() {
        await userEvent.click(await screen.findByRole('button', { name: 'Aksi untuk Auditor' }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Hapus role' }));

        return screen.findByRole('alertdialog');
    }

    it('names the role and deletes only after confirmation', async () => {
        asUser();
        const removed: string[] = [];
        let rows = [makeRole()];
        server.use(
            http.get('*/api/v1/roles', () => page(rows)),
            http.delete('*/api/v1/roles/:id', ({ params }) => {
                removed.push(String(params.id));
                rows = [];

                return new HttpResponse(null, { status: 204 });
            }),
        );

        renderApp('/roles');
        const dialog = await openDelete();

        expect(dialog).toHaveAccessibleName('Hapus role Auditor?');
        expect(removed).toEqual([]);

        await userEvent.click(within(dialog).getByRole('button', { name: 'Hapus role' }));

        expect(await screen.findByText('Role Auditor telah dihapus.')).toBeVisible();
        expect(await screen.findByText('Belum ada role')).toBeVisible();
        expect(removed).toEqual(['7']);
    });

    it('explains a role still in use inside the dialog and clears the error on close', async () => {
        asUser();
        serveList([makeRole()]);
        server.use(
            http.delete('*/api/v1/roles/:id', () =>
                HttpResponse.json({ code: 'ROLE_IN_USE' }, { status: 409 }),
            ),
        );

        renderApp('/roles');
        const dialog = await openDelete();
        await userEvent.click(within(dialog).getByRole('button', { name: 'Hapus role' }));

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            'Role masih dipakai oleh pengguna.',
        );
        expect(screen.getByRole('alertdialog')).toBeVisible();

        await userEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
        const reopened = await openDelete();
        expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument();
    });

    it('returns to the list after deleting from the detail page', async () => {
        asUser();
        serveDetail(makeRole());
        serveList([]);
        server.use(
            http.delete('*/api/v1/roles/:id', () => new HttpResponse(null, { status: 204 })),
        );

        const router = renderApp('/roles/7');
        await userEvent.click(await screen.findByRole('button', { name: 'Hapus role' }));
        const dialog = await screen.findByRole('alertdialog');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Hapus role' }));

        await screen.findByText('Belum ada role');
        expect(router.state.location.pathname).toBe('/roles');
    });
});

describe('role detail', () => {
    it('groups the permissions by module', async () => {
        asUser(['role.view']);
        serveDetail(makeRole({ permissions: ['audit.view', 'user.view'], users_count: 2 }));

        renderApp('/roles/7');

        expect(await screen.findByRole('heading', { name: 'Auditor' })).toBeVisible();
        expect(screen.getByText('Audit Log')).toBeVisible();
        expect(screen.getByText('Pengguna')).toBeVisible();
        expect(screen.getByText('user.view')).toBeVisible();
    });

    it('says when a role has no permissions', async () => {
        asUser(['role.view']);
        serveDetail(makeRole({ permissions: [] }));

        renderApp('/roles/7');

        expect(await screen.findByText('Role ini belum memiliki permission.')).toBeVisible();
    });

    it('hides delete on a built-in role', async () => {
        asUser();
        serveDetail(makeRole({ id: 1, name: 'Staff', is_protected: true }));

        renderApp('/roles/1');

        await screen.findByRole('heading', { name: 'Staff' });
        expect(screen.getByRole('link', { name: 'Ubah role' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Hapus role' })).not.toBeInTheDocument();
    });

    it('hides edit on the super admin role', async () => {
        asUser();
        serveDetail(makeRole({ id: 1, name: 'Super Admin', is_protected: true }));

        renderApp('/roles/1');

        await screen.findByRole('heading', { name: 'Super Admin' });
        expect(screen.queryByRole('link', { name: 'Ubah role' })).not.toBeInTheDocument();
    });

    it('explains a missing role without a retry and links back to the list', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/roles/99', () =>
                HttpResponse.json({ code: 'RESOURCE_NOT_FOUND' }, { status: 404 }),
            ),
        );

        renderApp('/roles/99');

        expect(await screen.findByText('Role tidak ditemukan')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Coba lagi' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Kembali ke daftar role' })).toHaveAttribute(
            'href',
            '/roles',
        );
    });
});

describe('role form', () => {
    beforeEach(() => servePermissions());

    it('supports searching and selecting all permissions per module', async () => {
        asUser();

        renderApp('/roles/new');

        expect(await screen.findByText('0 dari 3 dipilih')).toBeVisible();

        await userEvent.click(
            screen.getByRole('button', { name: 'Pilih semua permission Pengguna' }),
        );

        expect(screen.getByRole('checkbox', { name: 'user.create' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'user.view' })).toBeChecked();
        expect(screen.getByText('2 dari 3 dipilih')).toBeVisible();

        await userEvent.type(screen.getByRole('searchbox', { name: 'Cari permission' }), 'audit');

        expect(screen.queryByRole('checkbox', { name: 'user.view' })).not.toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'audit.view' })).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Kosongkan permission Pengguna' }),
        );

        expect(screen.getByRole('checkbox', { name: 'user.view' })).not.toBeChecked();
        expect(screen.getByText('0 dari 3 dipilih')).toBeVisible();
    });

    it('creates a role with permissions and opens the detail page', async () => {
        asUser();
        let body: unknown;
        const created = makeRole({ id: 9, name: 'Baru' });
        serveDetail(created);
        server.use(
            http.post('*/api/v1/roles', async ({ request }) => {
                body = await request.json();

                return one(created, 201);
            }),
        );

        const router = renderApp('/roles/new');
        await userEvent.type(await screen.findByLabelText('Nama'), ' Baru ');
        await userEvent.click(await screen.findByRole('checkbox', { name: 'audit.view' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        await screen.findByRole('heading', { name: 'Baru' });
        expect(router.state.location.pathname).toBe('/roles/9');
        expect(body).toEqual({ name: 'Baru', permissions: ['audit.view'] });
    });

    it('requires a name before calling the server', async () => {
        asUser();

        renderApp('/roles/new');
        await userEvent.click(await screen.findByRole('button', { name: 'Simpan role' }));

        expect(await screen.findByText('Nama wajib diisi.')).toBeVisible();
    });

    it('shows backend errors on their fields', async () => {
        asUser();
        server.use(
            http.post('*/api/v1/roles', () =>
                HttpResponse.json(
                    { code: 'VALIDATION_FAILED', errors: { name: ['Nama sudah digunakan.'] } },
                    { status: 422 },
                ),
            ),
        );

        renderApp('/roles/new');
        await userEvent.type(await screen.findByLabelText('Nama'), 'Staff');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        expect(await screen.findByText('Nama sudah digunakan.')).toBeVisible();
        expect(screen.getByLabelText('Nama')).toHaveAttribute('aria-invalid', 'true');
    });

    it('fills the form when editing and sends changed permissions with the version', async () => {
        asUser();
        let body: unknown;
        const role = makeRole();
        serveDetail(role);
        server.use(
            http.patch('*/api/v1/roles/7', async ({ request }) => {
                body = await request.json();

                return one({ ...role, name: 'Auditor Baru' });
            }),
        );

        renderApp('/roles/7/edit');
        const name = await screen.findByLabelText('Nama');
        expect(name).toHaveValue('Auditor');
        expect(await screen.findByRole('checkbox', { name: 'user.view' })).toBeChecked();

        await userEvent.clear(name);
        await userEvent.type(name, 'Auditor Baru');
        await userEvent.click(screen.getByRole('checkbox', { name: 'user.view' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'audit.view' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        await screen.findByText('Role Auditor Baru telah disimpan.');
        expect(body).toEqual({ name: 'Auditor Baru', permissions: ['audit.view'], version: 3 });
    });

    it('shows the saved data right away instead of the previous version', async () => {
        asUser();
        const role = makeRole();
        // Only reads after the save hang, so the heading can come from the saved response alone.
        let saved = false;
        server.use(
            http.get('*/api/v1/roles/7', async () => {
                if (saved) {
                    await delay('infinite');
                }

                return one(role);
            }),
            http.patch('*/api/v1/roles/7', () => {
                saved = true;

                return one({ ...role, name: 'Nama Tersimpan' });
            }),
        );

        renderApp('/roles/7/edit');
        const name = await screen.findByLabelText('Nama');
        await userEvent.clear(name);
        await userEvent.type(name, 'Nama Tersimpan');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        expect(await screen.findByRole('heading', { name: 'Nama Tersimpan' })).toBeVisible();
    });

    it('omits permissions and version when they did not change', async () => {
        asUser();
        let body: unknown;
        const role = makeRole();
        serveDetail(role);
        server.use(
            http.patch('*/api/v1/roles/7', async ({ request }) => {
                body = await request.json();

                return one(role);
            }),
        );

        renderApp('/roles/7/edit');
        await screen.findByRole('checkbox', { name: 'user.view' });
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        await waitFor(() => expect(body).toEqual({ name: 'Auditor' }));
    });

    it('locks the name of a built-in role and does not send it', async () => {
        asUser();
        let body: unknown;
        const role = makeRole({ id: 1, name: 'Staff', is_protected: true });
        serveDetail(role);
        server.use(
            http.patch('*/api/v1/roles/1', async ({ request }) => {
                body = await request.json();

                return one(role);
            }),
        );

        renderApp('/roles/1/edit');
        expect(await screen.findByLabelText('Nama')).toBeDisabled();
        await userEvent.click(await screen.findByRole('checkbox', { name: 'audit.view' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        await waitFor(() =>
            expect(body).toEqual({ permissions: ['user.view', 'audit.view'], version: 3 }),
        );
    });

    it('does not offer a form for the super admin role', async () => {
        asUser();
        serveDetail(makeRole({ id: 1, name: 'Super Admin', is_protected: true }));

        renderApp('/roles/1/edit');

        expect(await screen.findByText('Role ini tidak dapat diubah')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Simpan role' })).not.toBeInTheDocument();
    });

    it('asks to reload after a version conflict and refills the form', async () => {
        asUser();
        let version = 3;
        server.use(
            http.get('*/api/v1/roles/7', () =>
                one(
                    makeRole({
                        version,
                        name: version === 3 ? 'Auditor' : 'Diubah Orang Lain',
                        permissions: version === 3 ? ['user.view'] : ['audit.view'],
                    }),
                ),
            ),
            http.patch('*/api/v1/roles/7', () => {
                version = 4;

                return HttpResponse.json({ code: 'RESOURCE_VERSION_CONFLICT' }, { status: 409 });
            }),
        );

        const router = renderApp('/roles/7/edit');
        await userEvent.click(await screen.findByRole('checkbox', { name: 'audit.view' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Data telah diubah oleh pengguna lain. Muat ulang lalu simpan kembali.',
        );
        expect(router.state.location.pathname).toBe('/roles/7/edit');

        await userEvent.click(screen.getByRole('button', { name: 'Muat ulang data role' }));

        await waitFor(() => expect(screen.getByLabelText('Nama')).toHaveValue('Diubah Orang Lain'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(await screen.findByRole('checkbox', { name: 'audit.view' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'user.view' })).not.toBeChecked();
    });

    it('explains a refused permission', async () => {
        asUser();
        const role = makeRole();
        serveDetail(role);
        server.use(
            http.patch('*/api/v1/roles/7', () =>
                HttpResponse.json({ code: 'AUTH_PRIVILEGE_ESCALATION' }, { status: 403 }),
            ),
        );

        renderApp('/roles/7/edit');
        await userEvent.click(await screen.findByRole('checkbox', { name: 'audit.view' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Anda tidak dapat memberikan akses melebihi kewenangan Anda.',
        );
        expect(
            screen.queryByRole('button', { name: 'Muat ulang data role' }),
        ).not.toBeInTheDocument();
    });

    it.each([
        ['assign', ['role.view', 'role.create', 'permission.view']],
        ['list', ['role.view', 'role.create', 'permission.assign']],
    ])('hides permissions without the %s permission', async (_name, permissions) => {
        asUser(permissions);
        let requests = 0;
        server.use(
            http.get('*/api/v1/permissions', () => {
                requests += 1;

                return HttpResponse.json({ success: true, message: '', data: [], meta: null });
            }),
        );

        renderApp('/roles/new');

        await screen.findByLabelText('Nama');
        expect(screen.queryByRole('group', { name: 'Permission' })).not.toBeInTheDocument();
        expect(requests).toBe(0);
    });

    it('explains when the permission list cannot load and offers a retry', async () => {
        asUser();
        let attempts = 0;
        server.use(
            http.get('*/api/v1/permissions', () => {
                attempts += 1;

                return attempts === 1
                    ? HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 })
                    : HttpResponse.json({
                          success: true,
                          message: '',
                          data: [{ id: 1, name: 'user.view' }],
                          meta: null,
                      });
            }),
        );

        renderApp('/roles/new');

        await screen.findByText('Daftar permission tidak dapat dimuat.');
        await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

        expect(await screen.findByRole('checkbox', { name: 'user.view' })).toBeVisible();
    });

    it('blocks the form routes without permission', async () => {
        asUser(['role.view']);

        renderApp('/roles/new');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });

    it('blocks the edit route without permission', async () => {
        asUser(['role.view']);

        renderApp('/roles/7/edit');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });
});
