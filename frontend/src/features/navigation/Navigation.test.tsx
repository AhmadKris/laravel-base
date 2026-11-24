import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENABLED_MODULES, server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { LayoutSection, ModuleSettings, NavigationLayout } from '@/types/api-response';

const SETTINGS_ADMIN = ['system_config.view', 'system_config.update'];
const SUPER_ADMIN = [...SETTINGS_ADMIN, 'system_config.feature_flags'];

const DEFAULT_SECTIONS: LayoutSection[] = [
    {
        key: 'administration',
        label: 'Administrasi',
        items: [
            { key: 'users', label: null, icon: null, hidden: false },
            { key: 'roles', label: null, icon: null, hidden: false },
            { key: 'settings', label: null, icon: null, hidden: false },
        ],
    },
];

function makeLayout(sections: LayoutSection[] = DEFAULT_SECTIONS, version = 1): NavigationLayout {
    return {
        sections,
        items: [
            {
                key: 'users',
                module: 'user_management',
                label: 'Pengguna',
                path: '/users',
                icon: 'users',
                can_hide: true,
                module_enabled: true,
            },
            {
                key: 'roles',
                module: 'authorization',
                label: 'Role',
                path: '/roles',
                icon: 'shield-check',
                can_hide: true,
                module_enabled: true,
            },
            {
                key: 'settings',
                module: 'system_configuration',
                label: 'Pengaturan',
                path: '/settings',
                icon: 'settings',
                can_hide: false,
                module_enabled: true,
            },
        ],
        icons: ['contact', 'key', 'shield-check', 'users', 'warehouse'],
        default: DEFAULT_SECTIONS,
        version,
    };
}

function makeModules(notificationEnabled = true, version = 1): ModuleSettings {
    return {
        modules: [
            {
                key: 'user_management',
                label: 'Pengguna',
                description: 'Akun pengguna.',
                is_core: true,
                enabled: true,
            },
            {
                key: 'notification',
                label: 'Notifikasi',
                description: 'Notifikasi di dalam aplikasi.',
                is_core: false,
                enabled: notificationEnabled,
            },
        ],
        version,
    };
}

const envelope = (data: unknown, status = 200) =>
    HttpResponse.json({ success: true, message: '', data, meta: null }, { status });

function asUser(permissions: string[]) {
    server.use(
        http.get('*/api/v1/auth/user', () => envelope(makeUser(permissions))),
        http.get('*/api/v1/system-configurations', () =>
            HttpResponse.json({
                success: true,
                message: '',
                data: [],
                meta: {
                    pagination: {
                        current_page: 1,
                        per_page: 100,
                        total: 0,
                        last_page: 1,
                        from: null,
                        to: null,
                    },
                },
            }),
        ),
    );
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

describe('menu settings', () => {
    let saved: { sections: LayoutSection[]; version: number }[];

    beforeEach(() => {
        saved = [];
        server.use(
            http.get('*/api/v1/navigation/layout', () => envelope(makeLayout())),
            http.put('*/api/v1/navigation/layout', async ({ request }) => {
                const body = (await request.json()) as {
                    sections: LayoutSection[];
                    version: number;
                };
                saved.push(body);

                return envelope(makeLayout(body.sections, body.version + 1));
            }),
        );
    });

    async function openMenuTab() {
        renderApp('/settings?tab=menu');

        return screen.findByLabelText('Nama bagian');
    }

    it('reorders, renames, hides, and saves the menu with the version', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        const sectionName = await openMenuTab();
        const saveButton = screen.getByRole('button', { name: 'Simpan menu' });

        expect(saveButton).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Tampilkan menu Pengaturan' })).toBeDisabled();

        await user.clear(sectionName);
        await user.type(sectionName, 'Admin');
        await user.click(screen.getByRole('button', { name: 'Turunkan menu Pengguna' }));
        await user.type(screen.getByRole('textbox', { name: 'Label menu Role' }), 'Hak akses');
        await user.click(screen.getByRole('checkbox', { name: 'Tampilkan menu Pengguna' }));

        const preview = screen.getByRole('complementary', { name: 'Pratinjau menu' });
        expect(within(preview).getByText('Hak akses')).toBeVisible();
        expect(within(preview).queryByText('Pengguna')).not.toBeInTheDocument();

        await user.click(saveButton);

        expect(await screen.findByText('Susunan menu telah disimpan.')).toBeVisible();
        expect(saved).toEqual([
            {
                sections: [
                    {
                        key: 'administration',
                        label: 'Admin',
                        items: [
                            { key: 'roles', label: 'Hak akses', icon: null, hidden: false },
                            { key: 'users', label: null, icon: null, hidden: true },
                            { key: 'settings', label: null, icon: null, hidden: false },
                        ],
                    },
                ],
                version: 1,
            },
        ]);
    });

    it('picks an icon by searching and returns to the registered icon', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        await openMenuTab();

        await user.click(screen.getByRole('button', { name: 'Ikon menu Role: Perisai' }));
        await user.type(screen.getByLabelText('Cari ikon'), 'akses');

        const options = screen.getByRole('group', { name: 'Pilihan ikon untuk menu Role' });
        expect(
            within(options)
                .getAllByRole('button')
                .map((button) => button.title),
        ).toEqual(['Kunci']);

        await user.keyboard('{Enter}');

        expect(screen.getByRole('button', { name: 'Ikon menu Role: Kunci' })).toHaveFocus();

        await user.click(
            screen.getByRole('button', { name: 'Ikon menu Pengguna: Kelompok orang' }),
        );
        await user.click(screen.getByRole('button', { name: 'Kontak' }));
        await user.click(screen.getByRole('button', { name: 'Ikon menu Pengguna: Kontak' }));
        await user.click(screen.getByRole('button', { name: 'Pakai ikon bawaan' }));
        await user.click(screen.getByRole('button', { name: 'Simpan menu' }));

        await waitFor(() => expect(saved).toHaveLength(1));
        expect(saved[0].sections[0].items).toEqual([
            { key: 'users', label: null, icon: null, hidden: false },
            { key: 'roles', label: null, icon: 'key', hidden: false },
            { key: 'settings', label: null, icon: null, hidden: false },
        ]);
    });

    it('explains when no icon matches the search', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        await openMenuTab();

        await user.click(screen.getByRole('button', { name: 'Ikon menu Role: Perisai' }));
        await user.type(screen.getByLabelText('Cari ikon'), 'pesawat');

        expect(screen.getByText('Tidak ada ikon yang cocok dengan "pesawat".')).toBeVisible();
    });

    it('collapses a section to a summary and expands it again', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        await openMenuTab();

        await user.click(screen.getByRole('checkbox', { name: 'Tampilkan menu Pengguna' }));
        await user.click(screen.getByRole('button', { name: 'Ciutkan bagian Administrasi' }));

        expect(screen.queryByRole('textbox', { name: 'Label menu Role' })).not.toBeInTheDocument();
        expect(screen.getByText('3 item, 1 disembunyikan')).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Nama bagian' })).toBeVisible();

        await user.click(screen.getByRole('button', { name: 'Bentangkan bagian Administrasi' }));

        expect(screen.getByRole('textbox', { name: 'Label menu Role' })).toBeVisible();
    });

    it('collapses every section at once and opens a section whose item the server rejects', async () => {
        asUser(SUPER_ADMIN);
        server.use(
            http.put('*/api/v1/navigation/layout', () =>
                HttpResponse.json(
                    {
                        success: false,
                        message: 'Data tidak valid.',
                        code: 'VALIDATION_ERROR',
                        errors: { 'sections.0.items.1.label': ['Label maksimal 50 karakter.'] },
                    },
                    { status: 422 },
                ),
            ),
        );
        const user = userEvent.setup();
        await openMenuTab();

        await user.click(screen.getByRole('button', { name: 'Tambah bagian' }));
        await user.click(screen.getByRole('button', { name: 'Ciutkan semua bagian' }));

        expect(screen.queryByRole('textbox', { name: 'Label menu Role' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Bentangkan semua bagian' })).toBeVisible();

        await user.click(screen.getByRole('button', { name: 'Simpan menu' }));

        expect(await screen.findByText('Label maksimal 50 karakter.')).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Label menu Role' })).toBeVisible();
    });

    it('adds a section, moves an item there, and deletes only empty sections', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        await openMenuTab();

        expect(screen.getByRole('button', { name: 'Hapus bagian Administrasi' })).toBeDisabled();

        await user.click(screen.getByRole('button', { name: 'Tambah bagian' }));
        await user.click(screen.getByRole('combobox', { name: 'Bagian untuk menu Role' }));
        await user.click(await screen.findByRole('option', { name: 'Bagian baru' }));

        const preview = screen.getByRole('complementary', { name: 'Pratinjau menu' });
        expect(within(preview).getByText('Bagian baru')).toBeVisible();

        await user.click(screen.getByRole('combobox', { name: 'Bagian untuk menu Role' }));
        await user.click(await screen.findByRole('option', { name: 'Administrasi' }));
        await user.click(screen.getByRole('button', { name: 'Hapus bagian Bagian baru' }));

        expect(screen.getAllByLabelText('Nama bagian')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Simpan menu' })).toBeEnabled();
    });

    it('saves a section without a name so its items show without a heading', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        const sectionName = await openMenuTab();

        await user.clear(sectionName);

        expect(sectionName).toHaveAccessibleDescription(
            'Tanpa judul: item di bagian ini tampil langsung di menu, sejajar dengan Beranda.',
        );
        const preview = screen.getByRole('complementary', { name: 'Pratinjau menu' });
        expect(within(preview).queryByText('Administrasi')).not.toBeInTheDocument();
        expect(within(preview).getByText('Pengguna')).toBeVisible();

        await user.type(sectionName, '   ');
        await user.click(screen.getByRole('button', { name: 'Simpan menu' }));

        await waitFor(() => expect(saved).toHaveLength(1));
        expect(saved[0].sections[0].label).toBeNull();
    });

    it('returns to the default arrangement', async () => {
        asUser(SUPER_ADMIN);
        server.use(
            http.get('*/api/v1/navigation/layout', () =>
                envelope(
                    makeLayout([
                        {
                            key: 'custom',
                            label: 'Kustom',
                            items: [
                                { key: 'settings', label: null, icon: null, hidden: false },
                                { key: 'users', label: 'Akun', icon: 'contact', hidden: false },
                                { key: 'roles', label: null, icon: null, hidden: false },
                            ],
                        },
                    ]),
                ),
            ),
        );
        const user = userEvent.setup();
        renderApp('/settings?tab=menu');

        expect(await screen.findByRole('textbox', { name: 'Nama bagian' })).toHaveValue('Kustom');

        await user.click(screen.getByRole('button', { name: 'Kembalikan ke bawaan' }));

        expect(screen.getByRole('textbox', { name: 'Nama bagian' })).toHaveValue('Administrasi');
        expect(screen.getByRole('textbox', { name: 'Label menu Pengguna' })).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Simpan menu' })).toBeEnabled();
    });

    it('asks to reload after a version conflict', async () => {
        asUser(SUPER_ADMIN);
        server.use(
            http.put('*/api/v1/navigation/layout', () =>
                HttpResponse.json({ code: 'RESOURCE_VERSION_CONFLICT' }, { status: 409 }),
            ),
        );
        const user = userEvent.setup();
        const sectionName = await openMenuTab();

        await user.type(sectionName, ' Utama');
        await user.click(screen.getByRole('button', { name: 'Simpan menu' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Data telah diubah oleh pengguna lain. Muat ulang lalu simpan kembali.',
        );
        expect(screen.getByRole('button', { name: 'Muat ulang susunan menu' })).toBeVisible();
    });

    it('offers the menu tab to settings administrators but the module tab only with feature rights', async () => {
        asUser(SETTINGS_ADMIN);

        renderApp('/settings');

        expect(await screen.findByRole('tab', { name: 'Menu' })).toBeVisible();
        expect(screen.queryByRole('tab', { name: 'Modul' })).not.toBeInTheDocument();
    });
});

describe('module settings', () => {
    let saved: { disabled: string[]; version: number }[];

    beforeEach(() => {
        saved = [];
        server.use(
            http.get('*/api/v1/modules', () => envelope(makeModules())),
            http.put('*/api/v1/modules', async ({ request }) => {
                const body = (await request.json()) as { disabled: string[]; version: number };
                saved.push(body);

                return envelope(makeModules(!body.disabled.includes('notification'), 2));
            }),
        );
    });

    it('keeps core modules on and confirms before disabling a module', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        renderApp('/settings?tab=modules');

        const notification = await screen.findByRole('switch', { name: 'Notifikasi' });
        expect(screen.getByRole('switch', { name: 'Pengguna' })).toBeDisabled();
        expect(screen.getByRole('switch', { name: 'Pengguna' })).toBeChecked();

        await user.click(notification);
        await user.click(screen.getByRole('button', { name: 'Simpan modul' }));

        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveAccessibleName('Nonaktifkan modul Notifikasi?');
        expect(saved).toEqual([]);

        await user.click(within(dialog).getByRole('button', { name: 'Nonaktifkan modul' }));

        expect(await screen.findByText('Pengaturan modul telah disimpan.')).toBeVisible();
        expect(saved).toEqual([{ disabled: ['notification'], version: 1 }]);
        await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('enables a module without asking', async () => {
        asUser(SUPER_ADMIN);
        server.use(http.get('*/api/v1/modules', () => envelope(makeModules(false))));
        const user = userEvent.setup();
        renderApp('/settings?tab=modules');

        await user.click(await screen.findByRole('switch', { name: 'Notifikasi' }));
        await user.click(screen.getByRole('button', { name: 'Simpan modul' }));

        await waitFor(() => expect(saved).toEqual([{ disabled: [], version: 1 }]));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
});

it('explains that the page of a disabled module is unavailable', async () => {
    asUser([]);
    server.use(
        http.get('*/api/v1/navigation', () =>
            envelope({
                sections: [],
                modules: ENABLED_MODULES.filter((key) => key !== 'notification'),
            }),
        ),
    );

    renderApp('/notifications');

    expect(await screen.findByText('Modul tidak aktif')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/');
});
