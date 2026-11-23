import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { Role } from '@/types/api-response';
import { permissionFixtures } from '../permissionFixtures';

const ALL = [
    'role.view',
    'role.create',
    'role.update',
    'role.delete',
    'permission.view',
    'permission.assign',
    'user.view',
    'user.create',
    'audit.view',
];

function makeRole(overrides: Partial<Role> = {}): Role {
    return {
        id: 7,
        name: 'Auditor',
        description: null,
        is_protected: false,
        can_assign: true,
        users_count: 0,
        permissions_count: 1,
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
                data: permissionFixtures(names),
                meta: null,
            }),
        ),
    );
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

describe('role list', () => {
    it('shows name, type, user count, and permission count', async () => {
        asUser();
        serveList([
            makeRole({ users_count: 4, permissions_count: 3 }),
            makeRole({ id: 1, name: 'Staff', is_protected: true, permissions_count: 1 }),
        ]);

        renderApp('/roles');

        const row = (await screen.findByRole('link', { name: 'Auditor' })).closest('tr');
        expect(row).toHaveTextContent('Kustom');
        expect(row).toHaveTextContent('4');
        expect(row).toHaveTextContent('3 izin');
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

    it('filters by type, sorts by user count, and shows the description', async () => {
        asUser();
        const requests: URLSearchParams[] = [];
        server.use(
            http.get('*/api/v1/roles', ({ request }) => {
                requests.push(new URL(request.url).searchParams);

                return page([makeRole({ description: 'Tim audit internal.' })]);
            }),
        );

        renderApp('/roles');

        expect(await screen.findByText('Tim audit internal.')).toBeVisible();

        await userEvent.click(screen.getByRole('combobox', { name: 'Filter jenis role' }));
        await userEvent.click(await screen.findByRole('option', { name: 'Kustom' }));
        await waitFor(() => expect(requests.at(-1)?.get('type')).toBe('custom'));

        await userEvent.click(screen.getByRole('button', { name: 'Jumlah pengguna' }));
        await waitFor(() => expect(requests.at(-1)?.get('sort_by')).toBe('users_count'));
        expect(requests.at(-1)?.get('type')).toBe('custom');
    });

    it('offers to duplicate a role only with the rights to copy its permissions', async () => {
        asUser(['role.view', 'role.create', 'permission.view']);
        serveList([makeRole()]);

        renderApp('/roles');

        await screen.findByRole('link', { name: 'Auditor' });
        expect(
            screen.queryByRole('button', { name: 'Aksi untuk Auditor' }),
        ).not.toBeInTheDocument();
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
    it('groups permissions by module and links user count to filtered users', async () => {
        asUser(['role.view', 'user.view']);
        serveDetail(makeRole({ permissions: ['audit.view', 'user.view'], users_count: 2 }));
        server.use(
            http.get('*/api/v1/roles/7/permissions', () =>
                HttpResponse.json({
                    success: true,
                    message: '',
                    data: permissionFixtures(['user.view', 'audit.view']),
                    meta: null,
                }),
            ),
        );

        renderApp('/roles/7');

        expect(await screen.findByRole('heading', { name: 'Auditor' })).toBeVisible();
        const userTerm = await screen.findByText('Pengguna', { selector: 'dt' });
        expect(userTerm.nextElementSibling).toHaveTextContent('Lihat pengguna');
        expect(
            screen.getByText('Audit Log', { selector: 'dt' }).nextElementSibling,
        ).toHaveTextContent('Lihat audit log');
        expect(screen.getByText('Lihat audit log')).toHaveAttribute('title', 'audit.view');
        expect(screen.getByRole('link', { name: '2 pengguna' })).toHaveAttribute(
            'href',
            '/users?role=Auditor',
        );
    });

    it('offers a retry when the permissions of a role cannot load', async () => {
        asUser(['role.view']);
        serveDetail(makeRole());
        let attempts = 0;
        server.use(
            http.get('*/api/v1/roles/7/permissions', () => {
                attempts += 1;

                return attempts === 1
                    ? HttpResponse.json({ code: 'AUTH_FORBIDDEN' }, { status: 403 })
                    : HttpResponse.json({
                          success: true,
                          message: '',
                          data: permissionFixtures(['user.view']),
                          meta: null,
                      });
            }),
        );

        renderApp('/roles/7');

        expect(await screen.findByText('Hak akses tidak dapat dimuat')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
        expect(await screen.findByText('Lihat pengguna')).toBeVisible();
    });

    it('shows the description of a role', async () => {
        asUser(['role.view']);
        serveDetail(makeRole({ description: 'Tim audit internal.', permissions: [] }));

        renderApp('/roles/7');

        expect(await screen.findByText('Tim audit internal.')).toBeVisible();
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

    it('hides edit and duplicate on the super admin role', async () => {
        asUser();
        serveDetail(makeRole({ id: 1, name: 'Super Admin', is_protected: true }));

        renderApp('/roles/1');

        await screen.findByRole('heading', { name: 'Super Admin' });
        expect(screen.queryByRole('link', { name: 'Ubah role' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Duplikat role' })).not.toBeInTheDocument();
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

    it('supports searching, selecting per module, auto-dependencies, and filtering selected permissions', async () => {
        asUser();

        renderApp('/roles/new');

        expect(await screen.findByText('0 dari 3 dipilih')).toBeVisible();

        // Checking user.create automatically enables its user.view prerequisite.
        await userEvent.click(screen.getByRole('checkbox', { name: 'Tambah pengguna' }));
        expect(screen.getByRole('checkbox', { name: 'Tambah pengguna' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Lihat pengguna' })).toBeChecked();
        expect(screen.getByText('2 dari 3 dipilih')).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: 'Dipilih (2)' }));
        expect(screen.queryByRole('checkbox', { name: 'Lihat audit log' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Semua' }));
        expect(screen.getByRole('checkbox', { name: 'Lihat audit log' })).toBeVisible();

        // Unchecking the user.view prerequisite also unchecks user.create.
        await userEvent.click(screen.getByRole('checkbox', { name: 'Lihat pengguna' }));
        expect(screen.getByRole('checkbox', { name: 'Tambah pengguna' })).not.toBeChecked();
        expect(screen.getByText('0 dari 3 dipilih')).toBeVisible();

        await userEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua izin Pengguna' }));
        expect(screen.getByRole('checkbox', { name: 'Tambah pengguna' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Lihat pengguna' })).toBeChecked();

        await userEvent.type(
            screen.getByRole('searchbox', { name: 'Cari permission' }),
            'jejak aktivitas',
        );

        expect(screen.queryByRole('checkbox', { name: 'Lihat pengguna' })).not.toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Lihat audit log' })).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua izin Pengguna' }));

        expect(screen.getByRole('checkbox', { name: 'Lihat pengguna' })).not.toBeChecked();
        expect(screen.getByText('0 dari 3 dipilih')).toBeVisible();
    });

    it('puts common actions in columns and lists the special ones by name', async () => {
        asUser([...ALL, 'user.assign_role']);
        servePermissions(['user.view', 'user.assign_role', 'role.view']);

        renderApp('/roles/new');

        const userRow = await screen.findByRole('group', { name: 'Pengguna' });
        const cells = within(userRow).getAllByRole('checkbox');
        expect(cells.map((cell) => cell.getAttribute('aria-label') ?? cell.id)).toEqual([
            'Pilih semua izin Pengguna',
            'role-permission-user.view',
            'role-permission-user.assign_role',
        ]);
        expect(within(userRow).getByText('Tetapkan role pengguna')).not.toHaveClass('md:sr-only');
        expect(within(userRow).getByText('Lihat pengguna')).toHaveClass('md:sr-only');

        // A special action pulls in its prerequisites from other modules too.
        await userEvent.click(
            within(userRow).getByRole('checkbox', { name: 'Tetapkan role pengguna' }),
        );
        expect(screen.getByRole('checkbox', { name: 'Lihat role' })).toBeChecked();
        expect(screen.getByText('3 dari 3 dipilih')).toBeVisible();
    });

    it('explains each permission of a module on request', async () => {
        asUser(['role.view', 'role.create', 'permission.view', 'permission.assign', 'user.view']);
        servePermissions(['user.view', 'user.create']);

        renderApp('/roles/new');

        await userEvent.click(
            await screen.findByRole('button', { name: 'Keterangan izin Pengguna' }),
        );

        const details = await screen.findByRole('dialog');
        expect(details).toHaveTextContent('Membuat akun pengguna baru.');
        expect(details).toHaveTextContent('user.create');
        expect(details).toHaveTextContent('Membutuhkan: Lihat pengguna');
        expect(details).toHaveTextContent('Di luar kewenangan Anda.');
    });

    it('locks permissions above the actor and shows user impact and diff when editing', async () => {
        asUser(['role.view', 'role.update', 'permission.view', 'permission.assign', 'user.view']);
        serveDetail(makeRole({ users_count: 5, permissions: ['user.view'] }));

        renderApp('/roles/7/edit');

        const auditBox = await screen.findByRole('checkbox', { name: 'Lihat audit log' });
        expect(auditBox).toBeDisabled();
        expect(screen.getByText(/di luar kewenangan akun Anda/)).toBeVisible();

        await userEvent.click(screen.getByRole('checkbox', { name: 'Lihat pengguna' }));
        expect(screen.getByText(/Perubahan hak akses langsung berlaku untuk/)).toHaveTextContent(
            '5 pengguna',
        );
        expect(screen.getByText('-1 dicabut')).toBeVisible();
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
        await userEvent.click(await screen.findByRole('checkbox', { name: 'Lihat audit log' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        await screen.findByRole('heading', { name: 'Baru' });
        expect(router.state.location.pathname).toBe('/roles/9');
        expect(body).toEqual({ name: 'Baru', permissions: ['audit.view'] });
    });

    it('duplicates a role with only the permissions the actor may grant', async () => {
        asUser([...ALL, 'user.assign_role']);
        servePermissions(['user.view', 'audit.view', 'role.view']);
        const source = makeRole({
            description: 'Tim audit internal.',
            permissions: ['user.view', 'audit.view', 'system_config.update'],
        });
        serveDetail(source);
        let body: unknown;
        const created = makeRole({ id: 9, name: 'Salinan Auditor' });
        server.use(
            http.post('*/api/v1/roles', async ({ request }) => {
                body = await request.json();

                return one(created, 201);
            }),
            http.get('*/api/v1/roles/9', () => one(created)),
        );

        const router = renderApp('/roles/7');
        await userEvent.click(await screen.findByRole('link', { name: 'Duplikat role' }));

        expect(await screen.findByRole('heading', { name: 'Duplikat role' })).toBeVisible();
        expect(router.state.location.search).toBe('?copy=7');
        expect(screen.getByLabelText('Nama')).toHaveValue('Salinan Auditor');
        expect(screen.getByLabelText('Deskripsi')).toHaveValue('Tim audit internal.');
        expect(
            screen.getByText(/1 izin dari role Auditor tidak disalin karena berada di/),
        ).toBeVisible();
        expect(await screen.findByRole('checkbox', { name: 'Lihat audit log' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Lihat role' })).not.toBeChecked();

        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        await screen.findByRole('heading', { name: 'Salinan Auditor' });
        expect(body).toEqual({
            name: 'Salinan Auditor',
            description: 'Tim audit internal.',
            permissions: ['user.view', 'audit.view'],
        });
    });

    it('sends the description only when it changed', async () => {
        asUser();
        let body: unknown;
        const role = makeRole({ description: 'Lama' });
        serveDetail(role);
        server.use(
            http.patch('*/api/v1/roles/7', async ({ request }) => {
                body = await request.json();

                return one(role);
            }),
        );

        renderApp('/roles/7/edit');
        const description = await screen.findByLabelText('Deskripsi');
        await userEvent.clear(description);
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        await waitFor(() => expect(body).toEqual({ name: 'Auditor', description: null }));
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
        expect(await screen.findByRole('checkbox', { name: 'Lihat pengguna' })).toBeChecked();

        await userEvent.clear(name);
        await userEvent.type(name, 'Auditor Baru');
        await userEvent.click(screen.getByRole('checkbox', { name: 'Lihat pengguna' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Lihat audit log' }));
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
        await screen.findByRole('checkbox', { name: 'Lihat pengguna' });
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
        await userEvent.click(await screen.findByRole('checkbox', { name: 'Lihat audit log' }));
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
        await userEvent.click(await screen.findByRole('checkbox', { name: 'Lihat audit log' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan role' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Data telah diubah oleh pengguna lain. Muat ulang lalu simpan kembali.',
        );
        expect(router.state.location.pathname).toBe('/roles/7/edit');

        await userEvent.click(screen.getByRole('button', { name: 'Muat ulang data role' }));

        await waitFor(() => expect(screen.getByLabelText('Nama')).toHaveValue('Diubah Orang Lain'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(await screen.findByRole('checkbox', { name: 'Lihat audit log' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Lihat pengguna' })).not.toBeChecked();
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
        await userEvent.click(await screen.findByRole('checkbox', { name: 'Lihat audit log' }));
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
                          data: permissionFixtures(['user.view']),
                          meta: null,
                      });
            }),
        );

        renderApp('/roles/new');

        await screen.findByText('Daftar permission tidak dapat dimuat.');
        await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

        expect(await screen.findByRole('checkbox', { name: 'Lihat pengguna' })).toBeVisible();
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
