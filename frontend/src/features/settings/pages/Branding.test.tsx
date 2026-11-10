import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { Branding, SystemConfiguration } from '@/types/api-response';

type BrandingFile = 'logo' | 'logo_dark' | 'favicon';

let branding: Branding;

function makeBranding(overrides: Partial<Branding> = {}): Branding {
    return {
        logo: null,
        logo_dark: null,
        favicon: null,
        display: { show_name: true, background: 'transparent', size: 'medium' },
        ...overrides,
    };
}
let uploads: { asset: string; name: string }[];
let removals: string[];

function asUser(permissions = ['system_config.view', 'system_config.update']) {
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

function setting(key: string): SystemConfiguration {
    return {
        key,
        value: null,
        is_public: false,
        is_sensitive: false,
        description: null,
        version: 1,
        updated_at: null,
    };
}

let displayUpdates: { key: string; value: unknown }[];

function serveBranding() {
    server.use(
        http.patch('*/api/v1/system-configurations/:key', async ({ params, request }) => {
            const { value } = (await request.json()) as { value: unknown };
            const key = String(params.key);
            displayUpdates.push({ key, value });

            if (key === 'company.logo_show_name') {
                branding = {
                    ...branding,
                    display: { ...branding.display, show_name: value === true },
                };
            }

            return HttpResponse.json({
                success: true,
                message: '',
                data: { ...setting(key), value, version: 2 },
                meta: null,
            });
        }),
        http.get('*/api/v1/system-configurations', () =>
            HttpResponse.json({
                success: true,
                message: '',
                data: [
                    setting('company.name'),
                    setting('company.logo'),
                    setting('company.logo_dark'),
                    setting('company.favicon'),
                    { ...setting('company.logo_show_name'), value: true },
                    { ...setting('company.logo_background'), value: 'transparent' },
                    { ...setting('company.logo_size'), value: 'medium' },
                ],
                meta: {
                    pagination: {
                        current_page: 1,
                        per_page: 100,
                        total: 3,
                        last_page: 1,
                        from: 1,
                        to: 3,
                    },
                },
            }),
        ),
        http.get('*/api/v1/branding', () =>
            HttpResponse.json({ success: true, message: '', data: branding, meta: null }),
        ),
        http.post('*/api/v1/branding/:asset', async ({ params, request }) => {
            const asset = String(params.asset).replace('-', '_') as BrandingFile;
            // undici cannot parse a jsdom File, so the name is read from the multipart body.
            const body = await request.text();
            const name = /name="file"; filename="([^"]+)"/.exec(body)?.[1] ?? '';
            uploads.push({ asset, name });
            branding = { ...branding, [asset]: { version: (branding[asset]?.version ?? 1) + 1 } };

            return HttpResponse.json({
                success: true,
                message: '',
                data: branding[asset],
                meta: null,
            });
        }),
        http.delete('*/api/v1/branding/:asset', ({ params }) => {
            const asset = String(params.asset).replace('-', '_') as BrandingFile;
            removals.push(asset);
            branding = { ...branding, [asset]: null };

            return new HttpResponse(null, { status: 204 });
        }),
    );
}

const image = (name: string, size = 10) =>
    new File([new Uint8Array(size)], name, { type: 'image/png' });

const fieldOf = (label: string) =>
    screen.getByText(label, { selector: 'label' }).closest('div.flex') as HTMLElement;

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
    branding = makeBranding();
    uploads = [];
    removals = [];
    displayUpdates = [];
    vi.stubGlobal(
        'URL',
        Object.assign(URL, { createObjectURL: () => 'blob:preview', revokeObjectURL: vi.fn() }),
    );
});

describe('logo and favicon settings', () => {
    it('shows the default look and the allowed files', async () => {
        asUser();
        serveBranding();

        renderApp('/settings');

        expect(await screen.findByRole('heading', { name: 'Logo dan favicon' })).toBeVisible();
        expect(
            screen.getByText(
                'PNG, JPG, atau WebP sampai 2 MB. Ukurannya disesuaikan otomatis. PNG transparan menyatu dengan semua latar.',
            ),
        ).toBeVisible();
        expect(within(fieldOf('Logo')).getByText('Bawaan')).toBeVisible();
        expect(within(fieldOf('Logo')).getByRole('button', { name: 'Pilih file' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Hapus logo' })).not.toBeInTheDocument();
        expect(screen.queryByText('company.logo')).not.toBeInTheDocument();
    });

    it('previews the chosen file and uploads it on save', async () => {
        asUser();
        serveBranding();

        renderApp('/settings');
        await userEvent.upload(await screen.findByLabelText('Logo'), image('logo kantor.png'));

        expect(screen.getByRole('img', { name: 'Pratinjau logo' })).toHaveAttribute(
            'src',
            'blob:preview',
        );
        expect(screen.getByText('File dipilih: logo kantor.png')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'Simpan logo' }));

        expect(await screen.findByText('Logo telah disimpan.')).toBeVisible();
        expect(uploads).toEqual([{ asset: 'logo', name: 'logo kantor.png' }]);
        await waitFor(() =>
            expect(screen.getByRole('img', { name: 'Logo saat ini' })).toHaveAttribute(
                'src',
                '/api/v1/branding/logo?v=2',
            ),
        );
        expect(
            document.querySelector('img[alt=""][src="/api/v1/branding/logo?v=2"]'),
        ).not.toBeNull();
    });

    it('accepts files up to the size limit', async () => {
        asUser();
        serveBranding();

        renderApp('/settings');
        await userEvent.upload(
            await screen.findByLabelText('Logo'),
            image('logo.png', 2 * 1024 * 1024),
        );
        await userEvent.upload(screen.getByLabelText('Favicon'), image('favicon.jpg', 1024 * 1024));

        expect(screen.getByRole('button', { name: 'Simpan logo' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Simpan favicon' })).toBeEnabled();
    });

    it('rejects a file type or size before uploading', async () => {
        asUser();
        serveBranding();
        const user = userEvent.setup({ applyAccept: false });

        renderApp('/settings');
        await user.upload(await screen.findByLabelText('Logo'), image('logo.svg'));
        await user.upload(screen.getByLabelText('Favicon'), image('favicon.gif'));

        expect(
            screen.getByText('Favicon harus berupa file PNG, JPG, WebP, atau ICO.'),
        ).toBeVisible();

        expect(screen.getByText('Logo harus berupa file PNG, JPG, atau WebP.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Simpan logo' })).toBeDisabled();

        await user.upload(screen.getByLabelText('Favicon'), image('favicon.png', 1024 * 1024 + 1));

        expect(screen.getByText('Favicon maksimal 1 MB.')).toBeVisible();
        expect(uploads).toEqual([]);
    });

    it('shows the server message for a rejected file', async () => {
        asUser();
        serveBranding();
        server.use(
            http.post('*/api/v1/branding/favicon', () =>
                HttpResponse.json(
                    {
                        success: false,
                        message: '',
                        code: 'VALIDATION_FAILED',
                        errors: {
                            file: [
                                'Favicon tidak dapat dibaca. Simpan ulang gambarnya lalu unggah kembali.',
                            ],
                        },
                    },
                    { status: 422 },
                ),
            ),
        );

        renderApp('/settings');
        await userEvent.upload(await screen.findByLabelText('Favicon'), image('favicon.png'));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan favicon' }));

        expect(
            await screen.findByText(
                'Favicon tidak dapat dibaca. Simpan ulang gambarnya lalu unggah kembali.',
            ),
        ).toBeVisible();
        expect(screen.getByLabelText('Favicon')).toHaveAttribute('aria-invalid', 'true');
    });

    it('drops the chosen file on cancel', async () => {
        asUser();
        serveBranding();

        renderApp('/settings');
        await userEvent.upload(await screen.findByLabelText('Logo'), image('logo.png'));
        await userEvent.click(within(fieldOf('Logo')).getByRole('button', { name: 'Batal' }));

        expect(within(fieldOf('Logo')).getByText('Bawaan')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Simpan logo' })).not.toBeInTheDocument();
    });

    it('removes an uploaded logo after confirming', async () => {
        asUser();
        branding = makeBranding({ logo: { version: 4 }, favicon: null });
        serveBranding();

        renderApp('/settings');
        await userEvent.click(await screen.findByRole('button', { name: 'Hapus logo' }));
        const dialog = await screen.findByRole('alertdialog', { name: 'Hapus logo perusahaan?' });
        await userEvent.click(within(dialog).getByRole('button', { name: 'Hapus logo' }));

        expect(await screen.findByText('Logo telah dihapus.')).toBeVisible();
        expect(removals).toEqual(['logo']);
        await waitFor(() => expect(within(fieldOf('Logo')).getByText('Bawaan')).toBeVisible());
    });

    it('only shows the files without the update permission', async () => {
        asUser(['system_config.view']);
        branding = makeBranding({ logo: { version: 2 }, favicon: null });
        serveBranding();

        renderApp('/settings');

        expect(await screen.findByRole('img', { name: 'Logo saat ini' })).toBeVisible();
        expect(
            screen.queryByRole('button', { name: /Pilih file|Ganti file|Hapus logo/ }),
        ).not.toBeInTheDocument();
    });
});

describe('logo for dark backgrounds and display options', () => {
    it('uploads a separate logo for dark backgrounds', async () => {
        asUser();
        serveBranding();

        renderApp('/settings');
        await userEvent.upload(
            await screen.findByLabelText('Logo latar gelap'),
            image('logo-putih.png'),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Simpan logo latar gelap' }));

        expect(await screen.findByText('Logo latar gelap telah disimpan.')).toBeVisible();
        expect(uploads).toEqual([{ asset: 'logo_dark', name: 'logo-putih.png' }]);
    });

    it('previews the display options before saving and saves them', async () => {
        asUser();
        branding = makeBranding({ logo: { version: 2 }, logo_dark: { version: 3 } });
        serveBranding();

        renderApp('/settings');
        const preview = (await screen.findByText('Pratinjau')).parentElement as HTMLElement;
        await waitFor(() =>
            expect(within(preview).getAllByText('Enterprise System')).toHaveLength(2),
        );
        expect(preview.querySelector('img[src="/api/v1/branding/logo-dark?v=3"]')).not.toBeNull();

        await userEvent.click(
            screen.getByRole('checkbox', { name: 'Tampilkan nama perusahaan di samping logo' }),
        );

        expect(within(preview).queryByText('Enterprise System')).not.toBeInTheDocument();
        expect(within(preview).getAllByRole('img', { name: 'Enterprise System' })).toHaveLength(2);
        expect(displayUpdates).toEqual([]);

        await userEvent.click(screen.getByRole('button', { name: 'Simpan tampilan logo' }));

        expect(await screen.findByText('Pengaturan tampilan logo telah disimpan.')).toBeVisible();
        expect(displayUpdates).toEqual([{ key: 'company.logo_show_name', value: false }]);

        const sidebar = document.querySelector('[data-slot="sidebar-header"]') as HTMLElement;
        await waitFor(() =>
            expect(within(sidebar).queryByText('Enterprise System')).not.toBeInTheDocument(),
        );
    });

    it('explains that the options need an uploaded logo', async () => {
        asUser();
        serveBranding();

        renderApp('/settings');

        expect(
            await screen.findByText('Pengaturan ini berlaku setelah logo diunggah.'),
        ).toBeVisible();
    });
});

describe('branding in the app', () => {
    it('shows only the logo, named for screen readers, when the name is turned off', async () => {
        asUser();
        branding = makeBranding({
            logo: { version: 2 },
            display: { show_name: false, background: 'white', size: 'large' },
        });
        serveBranding();

        renderApp('/');

        const header = (await screen.findByRole('img', { name: 'Enterprise System' })).closest(
            '[data-slot="sidebar-header"]',
        ) as HTMLElement;
        expect(within(header).queryByText('Enterprise System')).not.toBeInTheDocument();
    });

    it('uses the logo for dark backgrounds on the login panel', async () => {
        branding = makeBranding({ logo: { version: 2 }, logo_dark: { version: 7 } });
        serveBranding();
        server.use(
            http.get('*/api/v1/auth/user', () =>
                HttpResponse.json(
                    { success: false, message: '', code: 'AUTH_UNAUTHENTICATED' },
                    { status: 401 },
                ),
            ),
        );

        renderApp('/login');

        await waitFor(() =>
            expect(
                document.querySelector('aside img[src="/api/v1/branding/logo-dark?v=7"]'),
            ).not.toBeNull(),
        );
        expect(document.querySelector('main img[src="/api/v1/branding/logo?v=2"]')).not.toBeNull();
    });

    it('shows the uploaded logo on the login page', async () => {
        branding = makeBranding({ logo: { version: 5 }, favicon: null });
        serveBranding();
        server.use(
            http.get('*/api/v1/auth/user', () =>
                HttpResponse.json(
                    { success: false, message: '', code: 'AUTH_UNAUTHENTICATED' },
                    { status: 401 },
                ),
            ),
        );

        renderApp('/login');

        await waitFor(() =>
            expect(document.querySelector('img[src="/api/v1/branding/logo?v=5"]')).not.toBeNull(),
        );
    });

    it('puts the uploaded favicon in the page head and removes it when deleted', async () => {
        asUser();
        branding = makeBranding({ favicon: { version: 3 } });
        serveBranding();

        renderApp('/settings');

        await waitFor(() =>
            expect(document.getElementById('app-favicon')).toHaveAttribute(
                'href',
                '/api/v1/branding/favicon?v=3',
            ),
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Hapus favicon' }));
        const dialog = await screen.findByRole('alertdialog', { name: 'Hapus favicon?' });
        await userEvent.click(within(dialog).getByRole('button', { name: 'Hapus favicon' }));

        await waitFor(() => expect(document.getElementById('app-favicon')).toBeNull());
    });
});
