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
            { key: 'users', label: null, hidden: false },
            { key: 'roles', label: null, hidden: false },
            { key: 'settings', label: null, hidden: false },
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
                            { key: 'roles', label: 'Hak akses', hidden: false },
                            { key: 'users', label: null, hidden: true },
                            { key: 'settings', label: null, hidden: false },
                        ],
                    },
                ],
                version: 1,
            },
        ]);
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

    it('requires a section name before calling the server', async () => {
        asUser(SUPER_ADMIN);
        const user = userEvent.setup();
        const sectionName = await openMenuTab();

        await user.clear(sectionName);
        await user.click(screen.getByRole('button', { name: 'Simpan menu' }));

        expect(await screen.findByText('Nama bagian wajib diisi.')).toBeVisible();
        expect(sectionName).toHaveAttribute('aria-invalid', 'true');
        expect(saved).toEqual([]);
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
                                { key: 'settings', label: null, hidden: false },
                                { key: 'users', label: 'Akun', hidden: false },
                                { key: 'roles', label: null, hidden: false },
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
