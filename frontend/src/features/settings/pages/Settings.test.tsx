import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { SystemConfiguration, UpdateConfigurationPayload } from '@/types/api-response';

const VIEW_AND_UPDATE = ['system_config.view', 'system_config.update'];

function makeSetting(
    key: string,
    value: SystemConfiguration['value'],
    overrides: Partial<SystemConfiguration> = {},
): SystemConfiguration {
    return {
        key,
        value,
        is_public: false,
        is_sensitive: false,
        description: null,
        version: 1,
        updated_at: '2026-11-01T03:00:00Z',
        ...overrides,
    };
}

let store: SystemConfiguration[];
let requests: { key: string; body: UpdateConfigurationPayload }[];

function asUser(permissions: string[] = VIEW_AND_UPDATE) {
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

const page = (rows: SystemConfiguration[], currentPage = 1, lastPage = 1) =>
    HttpResponse.json({
        success: true,
        message: '',
        data: rows,
        meta: {
            pagination: {
                current_page: currentPage,
                per_page: 100,
                total: rows.length,
                last_page: lastPage,
                from: 1,
                to: rows.length,
            },
        },
    });

function serveSettings() {
    server.use(
        http.get('*/api/v1/system-configurations', () => page(store)),
        http.patch('*/api/v1/system-configurations/:key', async ({ params, request }) => {
            const key = String(params.key);
            const body = (await request.json()) as UpdateConfigurationPayload;
            const current = store.find((item) => item.key === key) as SystemConfiguration;
            requests.push({ key, body });

            if (body.version !== current.version) {
                return HttpResponse.json(
                    {
                        success: false,
                        message: '',
                        code: 'RESOURCE_VERSION_CONFLICT',
                        errors: null,
                    },
                    { status: 409 },
                );
            }

            const updated = { ...current, value: body.value, version: current.version + 1 };
            store = store.map((item) => (item.key === key ? updated : item));

            return HttpResponse.json({ success: true, message: '', data: updated, meta: null });
        }),
    );
}

function rejectValue(key: string, message: string) {
    server.use(
        http.patch(`*/api/v1/system-configurations/${key}`, async ({ request }) => {
            requests.push({ key, body: (await request.json()) as UpdateConfigurationPayload });

            return HttpResponse.json(
                {
                    success: false,
                    message: '',
                    code: 'VALIDATION_FAILED',
                    errors: { value: [message] },
                },
                { status: 422 },
            );
        }),
    );
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
    requests = [];
    store = [
        makeSetting('company.name', 'PT Maju'),
        makeSetting('company.address', null),
        makeSetting('company.phone', '021'),
        makeSetting('company.email', null),
        makeSetting('localization.timezone', 'Asia/Jakarta'),
        makeSetting('localization.locale', 'id'),
        makeSetting('localization.currency', 'IDR'),
        makeSetting('feature.reports', false, { description: 'Modul laporan' }),
        makeSetting('mail.smtp_password', null, { is_sensitive: true }),
        makeSetting('upload.max_size_kb', 2048, { description: 'Batas ukuran unggahan' }),
    ];
});

function section(name: string) {
    return screen.getByRole('heading', { name }).closest('form') as HTMLElement;
}

async function openTab(name: string) {
    await userEvent.click(await screen.findByRole('tab', { name }));
}

describe('settings page', () => {
    it('shows each section in its tab with the stored values', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');

        expect(await screen.findByRole('tablist', { name: 'Kategori pengaturan' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Perusahaan' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByLabelText('Nama perusahaan')).toHaveValue('PT Maju');
        expect(screen.getByLabelText('Telepon')).toHaveValue('021');
        expect(screen.getByRole('button', { name: 'Simpan data perusahaan' })).toBeDisabled();

        await openTab('Lokalisasi');
        expect(screen.getByLabelText('Mata uang')).toHaveValue('IDR');
        expect(screen.getByRole('combobox', { name: 'Zona waktu' })).toHaveTextContent(
            'Asia/Jakarta',
        );
        expect(screen.getByRole('combobox', { name: 'Bahasa' })).toHaveTextContent(
            'Bahasa Indonesia',
        );
        expect(screen.getByRole('button', { name: 'Simpan lokalisasi' })).toBeDisabled();

        await openTab('Fitur');
        expect(screen.getByRole('checkbox', { name: 'Modul laporan' })).not.toBeChecked();
    });

    it('lists other keys read-only and never shows a sensitive value', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');
        await openTab('Konfigurasi lain');

        const others = screen
            .getByRole('heading', { name: 'Konfigurasi lain' })
            .closest('[data-slot="card"]') as HTMLElement;
        expect(within(others).getByText('upload.max_size_kb')).toBeVisible();
        expect(within(others).getByText('2048')).toBeVisible();
        expect(within(others).getByText('mail.smtp_password')).toBeVisible();
        expect(within(others).getByText('Nilai rahasia, tidak ditampilkan')).toBeVisible();
        expect(within(others).queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('keeps a sensitive known key out of the form', async () => {
        asUser();
        store = store.map((item) =>
            item.key === 'company.phone' ? { ...item, value: null, is_sensitive: true } : item,
        );
        serveSettings();

        renderApp('/settings');

        await screen.findByLabelText('Nama perusahaan');
        expect(screen.queryByLabelText('Telepon')).not.toBeInTheDocument();

        await openTab('Konfigurasi lain');
        expect(screen.getByText('company.phone')).toBeVisible();
    });

    it('reads every page of configurations', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/system-configurations', ({ request }) =>
                new URL(request.url).searchParams.get('page') === '2'
                    ? page([makeSetting('company.phone', '022')], 2, 2)
                    : page([makeSetting('company.name', 'PT Maju')], 1, 2),
            ),
        );

        renderApp('/settings');

        expect(await screen.findByLabelText('Telepon')).toHaveValue('022');
        expect(screen.getByLabelText('Nama perusahaan')).toHaveValue('PT Maju');
    });

    it('shows the settings read-only without the update permission', async () => {
        asUser(['system_config.view']);
        serveSettings();

        renderApp('/settings');

        expect(await screen.findByText('PT Maju')).toBeVisible();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Simpan/ })).not.toBeInTheDocument();

        await openTab('Lokalisasi');
        expect(screen.getByText('Bahasa Indonesia')).toBeVisible();
    });

    it('shows an error with a retry when loading fails', async () => {
        asUser();
        server.use(
            http.get('*/api/v1/system-configurations', () =>
                HttpResponse.json(
                    { success: false, message: '', code: 'SYSTEM_INTERNAL_ERROR', errors: null },
                    { status: 500 },
                ),
            ),
        );

        renderApp('/settings');

        expect(await screen.findByText('Pengaturan tidak dapat dimuat')).toBeVisible();

        serveSettings();
        await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

        expect(await screen.findByLabelText('Nama perusahaan')).toHaveValue('PT Maju');
    });

    it('denies access without the view permission', async () => {
        asUser([]);

        renderApp('/settings');

        expect(await screen.findByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    });
});

describe('saving settings', () => {
    it('sends only the changed keys with their versions', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        await userEvent.clear(name);
        await userEvent.type(name, 'PT Baru');
        await userEvent.clear(screen.getByLabelText('Telepon'));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        expect(await screen.findByText('Pengaturan perusahaan telah disimpan.')).toBeVisible();
        expect(requests).toEqual([
            { key: 'company.name', body: { value: 'PT Baru', version: 1 } },
            { key: 'company.phone', body: { value: null, version: 1 } },
        ]);
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Simpan data perusahaan' })).toBeDisabled(),
        );
    });

    it('uses the new version when saving again', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        await userEvent.type(name, ' Jaya');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));
        await screen.findByText('Pengaturan perusahaan telah disimpan.');

        await waitFor(() =>
            expect(screen.getByLabelText('Nama perusahaan')).toHaveValue('PT Maju Jaya'),
        );
        await userEvent.type(screen.getByLabelText('Nama perusahaan'), ' Abadi');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        await waitFor(() => expect(requests).toHaveLength(2));
        expect(requests[1]).toEqual({
            key: 'company.name',
            body: { value: 'PT Maju Jaya Abadi', version: 2 },
        });
    });

    it('saves a feature flag as a boolean', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');
        await openTab('Fitur');
        await userEvent.click(screen.getByRole('checkbox', { name: 'Modul laporan' }));
        await userEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan fitur' }));

        await screen.findByText('Pengaturan fitur telah disimpan.');
        expect(requests).toEqual([{ key: 'feature.reports', body: { value: true, version: 1 } }]);
    });

    it('validates before sending', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');
        await userEvent.clear(await screen.findByLabelText('Nama perusahaan'));
        await userEvent.type(screen.getByLabelText('Email'), 'bukan-email');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        expect(await screen.findByText('Nama perusahaan wajib diisi.')).toBeVisible();
        expect(screen.getByText('Email harus berupa alamat email yang valid.')).toBeVisible();

        await openTab('Lokalisasi');
        const currency = screen.getByLabelText('Mata uang');
        await userEvent.clear(currency);
        await userEvent.type(currency, 'rp');
        expect(currency).toHaveValue('RP');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan lokalisasi' }));

        expect(
            await screen.findByText('Mata uang harus berupa kode tiga huruf, misalnya IDR.'),
        ).toBeVisible();
        expect(requests).toEqual([]);
    });

    it('shows the server message on the field and keeps keys saved before it', async () => {
        asUser();
        serveSettings();
        rejectValue('company.phone', 'Telepon perusahaan tidak boleh lebih dari 30 karakter.');

        renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        await userEvent.clear(name);
        await userEvent.type(name, 'PT Baru');
        await userEvent.type(screen.getByLabelText('Telepon'), '9');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        expect(
            await screen.findByText('Telepon perusahaan tidak boleh lebih dari 30 karakter.'),
        ).toBeVisible();
        expect(screen.getByLabelText('Telepon')).toHaveValue('0219');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();

        serveSettings();
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        await screen.findByText('Pengaturan perusahaan telah disimpan.');
        expect(requests.map(({ key }) => key)).toEqual([
            'company.name',
            'company.phone',
            'company.phone',
        ]);
    });

    it('uses the new version of a key saved before a failure', async () => {
        asUser();
        serveSettings();
        rejectValue('company.phone', 'Telepon perusahaan tidak valid.');

        renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        await userEvent.type(name, ' Jaya');
        await userEvent.type(screen.getByLabelText('Telepon'), '9');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));
        await screen.findByText('Telepon perusahaan tidak valid.');

        serveSettings();
        await userEvent.type(name, ' Abadi');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        await screen.findByText('Pengaturan perusahaan telah disimpan.');
        expect(requests[2]).toEqual({
            key: 'company.name',
            body: { value: 'PT Maju Jaya Abadi', version: 2 },
        });
    });

    it('asks before leaving with unsaved changes in any section, and not after saving', async () => {
        asUser();
        serveSettings();

        const router = renderApp('/settings?tab=localization');
        const currency = await screen.findByLabelText('Mata uang');
        await userEvent.clear(currency);
        await userEvent.type(currency, 'USD');
        await userEvent.click(
            within(screen.getByRole('navigation', { name: 'Menu utama' })).getByRole('link', {
                name: 'Beranda',
            }),
        );

        expect(
            await screen.findByRole('alertdialog', { name: 'Tinggalkan halaman ini?' }),
        ).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
        expect(router.state.location.pathname).toBe('/settings');

        await userEvent.click(screen.getByRole('button', { name: 'Simpan lokalisasi' }));
        await screen.findByText('Pengaturan lokalisasi telah disimpan.');
        await userEvent.click(
            within(screen.getByRole('navigation', { name: 'Menu utama' })).getByRole('link', {
                name: 'Beranda',
            }),
        );

        await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    });

    it('keeps unsaved edits when switching tabs without blocking', async () => {
        asUser();
        serveSettings();

        const router = renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        await userEvent.type(name, ' Nusantara');

        await openTab('Lokalisasi');
        expect(router.state.location.search).toBe('?tab=localization');
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

        await openTab('Perusahaan');
        expect(screen.getByLabelText('Nama perusahaan')).toHaveValue('PT Maju Nusantara');
    });

    it('restores the stored values on cancel', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        await userEvent.type(name, ' Jaya');
        await userEvent.click(within(section('Perusahaan')).getByRole('button', { name: 'Batal' }));

        expect(name).toHaveValue('PT Maju');
        expect(screen.getByRole('button', { name: 'Simpan data perusahaan' })).toBeDisabled();
    });

    it('asks to reload when another user changed the setting', async () => {
        asUser();
        serveSettings();

        renderApp('/settings');
        const name = await screen.findByLabelText('Nama perusahaan');
        store = store.map((item) =>
            item.key === 'company.name' ? { ...item, value: 'PT Lain', version: 2 } : item,
        );
        await userEvent.type(name, ' Jaya');
        await userEvent.click(screen.getByRole('button', { name: 'Simpan data perusahaan' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Data telah diubah oleh pengguna lain.',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Muat ulang pengaturan' }));

        await waitFor(() =>
            expect(screen.getByLabelText('Nama perusahaan')).toHaveValue('PT Lain'),
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
