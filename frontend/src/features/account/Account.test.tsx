import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';
import type { Account, ActiveSession } from '@/types/api-response';
import { describeUserAgent } from './userAgent';

const envelope = (data: unknown, status = 200) =>
    HttpResponse.json({ success: true, message: '', data, meta: null }, { status });

function makeAccount(overrides: Partial<Account> = {}): Account {
    return {
        id: makeUser().id,
        name: 'Ani Lestari',
        email: 'ani@example.com',
        username: 'ani',
        phone: null,
        avatar: null,
        pending_email: null,
        roles: ['Staff'],
        last_login_at: null,
        created_at: '2026-11-01T03:00:00Z',
        ...overrides,
    };
}

function serveAccount(account: Account) {
    server.use(http.get('*/api/v1/account', () => envelope(account)));
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
    server.use(http.get('*/api/v1/auth/user', () => envelope(makeUser())));
});

describe('profile', () => {
    it('saves the name and phone and shows the new name in the header', async () => {
        serveAccount(makeAccount());
        let body: unknown;
        server.use(
            http.patch('*/api/v1/account', async ({ request }) => {
                body = await request.json();

                return envelope(makeAccount({ name: 'Ani Lestari Putri', phone: '0812 3456 789' }));
            }),
        );
        const user = userEvent.setup();
        renderApp('/account');

        const name = await screen.findByRole('textbox', { name: /^Nama/ });
        const save = screen.getByRole('button', { name: 'Simpan profil' });
        expect(save).toBeDisabled();

        await user.clear(name);
        await user.type(name, 'Ani Lestari Putri');
        await user.type(screen.getByRole('textbox', { name: /^Telepon/ }), '0812 3456 789');
        await user.click(save);

        expect(await screen.findByText('Profil telah disimpan.')).toBeVisible();
        expect(body).toEqual({ name: 'Ani Lestari Putri', phone: '0812 3456 789' });
        expect(screen.getByRole('button', { name: 'Menu akun Ani Lestari Putri' })).toBeVisible();
    });

    it('sends an emptied phone as null and checks the phone format before saving', async () => {
        serveAccount(makeAccount({ phone: '0812 3456 789' }));
        const bodies: unknown[] = [];
        server.use(
            http.patch('*/api/v1/account', async ({ request }) => {
                bodies.push(await request.json());

                return envelope(makeAccount());
            }),
        );
        const user = userEvent.setup();
        renderApp('/account');

        const phone = await screen.findByRole('textbox', { name: /^Telepon/ });
        await user.clear(phone);
        await user.type(phone, '0812-abc');
        await user.click(screen.getByRole('button', { name: 'Simpan profil' }));

        expect(
            await screen.findByText(
                'Telepon hanya boleh berisi angka, spasi, tanda kurung, titik, tanda hubung, dan + di awal.',
            ),
        ).toBeVisible();
        expect(bodies).toEqual([]);

        await user.clear(phone);
        await user.click(screen.getByRole('button', { name: 'Simpan profil' }));

        await waitFor(() => expect(bodies).toEqual([{ name: 'Ani Lestari', phone: null }]));
    });

    it('uploads a photo right after it is chosen and rejects other file types', async () => {
        serveAccount(makeAccount());
        let uploads = 0;
        server.use(
            http.post('*/api/v1/account/avatar', () => {
                uploads += 1;

                return envelope(makeAccount({ avatar: { version: 'abc123' } }));
            }),
        );
        const user = userEvent.setup({ applyAccept: false });
        renderApp('/account');

        const input = await screen.findByLabelText('Foto profil');
        await user.upload(input, new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }));

        expect(screen.getByText('Foto harus berupa file PNG, JPG, atau WebP.')).toBeVisible();
        expect(uploads).toBe(0);

        await user.upload(input, new File(['png'], 'me.png', { type: 'image/png' }));

        expect(await screen.findByText('Foto profil telah diganti.')).toBeVisible();
        expect(uploads).toBe(1);
        expect(screen.getByRole('button', { name: 'Hapus foto' })).toBeVisible();
    });

    it('asks before removing the photo', async () => {
        serveAccount(makeAccount({ avatar: { version: 'abc123' } }));
        let removed = false;
        server.use(
            http.delete('*/api/v1/account/avatar', () => {
                removed = true;

                return envelope(makeAccount());
            }),
        );
        const user = userEvent.setup();
        renderApp('/account');

        await user.click(await screen.findByRole('button', { name: 'Hapus foto' }));
        const dialog = await screen.findByRole('alertdialog', { name: 'Hapus foto profil?' });
        expect(removed).toBe(false);

        await user.click(within(dialog).getByRole('button', { name: 'Hapus foto' }));

        expect(await screen.findByText('Foto profil telah dihapus.')).toBeVisible();
        expect(removed).toBe(true);
        expect(screen.getByRole('button', { name: 'Unggah foto' })).toBeVisible();
    });
});

describe('email change', () => {
    it('sends the confirmation link and shows the address waiting for confirmation', async () => {
        let account = makeAccount();
        let body: unknown;
        server.use(
            http.get('*/api/v1/account', () => envelope(account)),
            http.post('*/api/v1/account/email', async ({ request }) => {
                body = await request.json();
                const pending = {
                    email: 'ani.baru@example.com',
                    expires_at: '2026-11-24T04:00:00Z',
                };
                account = makeAccount({ pending_email: pending });

                return envelope(pending);
            }),
        );
        const user = userEvent.setup();
        renderApp('/account');

        await user.type(await screen.findByLabelText(/^Email baru/), 'ani.baru@example.com');
        await user.type(screen.getByLabelText(/^Password akun/), 'password-saya-123');
        await user.click(screen.getByRole('button', { name: 'Kirim tautan konfirmasi' }));

        expect(
            await screen.findByText('Tautan konfirmasi telah dikirim ke ani.baru@example.com.'),
        ).toBeVisible();
        expect(body).toEqual({
            email: 'ani.baru@example.com',
            current_password: 'password-saya-123',
        });
        expect(await screen.findByRole('status')).toHaveTextContent(
            'Menunggu konfirmasi dari ani.baru@example.com',
        );
    });

    it('shows a wrong password next to the field', async () => {
        serveAccount(makeAccount());
        server.use(
            http.post('*/api/v1/account/email', () =>
                HttpResponse.json(
                    {
                        code: 'VALIDATION_FAILED',
                        errors: { current_password: ['Password salah.'] },
                    },
                    { status: 422 },
                ),
            ),
        );
        const user = userEvent.setup();
        renderApp('/account');

        await user.type(await screen.findByLabelText(/^Email baru/), 'ani.baru@example.com');
        await user.type(screen.getByLabelText(/^Password akun/), 'salah-sekali-123');
        await user.click(screen.getByRole('button', { name: 'Kirim tautan konfirmasi' }));

        expect(await screen.findByText('Password salah.')).toBeVisible();
        expect(screen.getByLabelText(/^Password akun/)).toHaveAttribute('aria-invalid', 'true');
    });

    it('cancels a change that waits for confirmation', async () => {
        serveAccount(
            makeAccount({
                pending_email: {
                    email: 'ani.baru@example.com',
                    expires_at: '2026-11-24T04:00:00Z',
                },
            }),
        );
        let cancelled = false;
        server.use(
            http.delete('*/api/v1/account/email', () => {
                cancelled = true;

                return new HttpResponse(null, { status: 204 });
            }),
        );
        const user = userEvent.setup();
        renderApp('/account');

        await user.click(await screen.findByRole('button', { name: 'Batalkan perubahan' }));

        expect(await screen.findByText('Perubahan email dibatalkan.')).toBeVisible();
        expect(cancelled).toBe(true);
    });
});

describe('sessions', () => {
    const current: ActiveSession = {
        id: 'a'.repeat(64),
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36',
        last_active_at: '2026-11-24T03:00:00Z',
        is_current: true,
    };
    const phone: ActiveSession = {
        id: 'b'.repeat(64),
        ip_address: '10.0.0.7',
        user_agent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36',
        last_active_at: '2026-11-23T03:00:00Z',
        is_current: false,
    };

    it('marks this device and ends another session after confirming', async () => {
        let sessions = [current, phone];
        const deleted: string[] = [];
        server.use(
            http.get('*/api/v1/auth/sessions', () => envelope(sessions)),
            http.delete('*/api/v1/auth/sessions/:id', ({ params }) => {
                deleted.push(String(params.id));
                sessions = [current];

                return new HttpResponse(null, { status: 204 });
            }),
        );
        const user = userEvent.setup();
        renderApp('/account?tab=security');

        expect(await screen.findByText('Perangkat ini')).toBeVisible();
        expect(screen.getByText('Chrome di Windows')).toBeVisible();

        await user.click(
            screen.getByRole('button', { name: 'Akhiri sesi Chrome di Android, 10.0.0.7' }),
        );
        const dialog = await screen.findByRole('alertdialog', {
            name: 'Akhiri sesi Chrome di Android?',
        });
        await user.click(within(dialog).getByRole('button', { name: 'Akhiri sesi' }));

        expect(await screen.findByText('Sesi Chrome di Android telah diakhiri.')).toBeVisible();
        expect(deleted).toEqual(['b'.repeat(64)]);
        expect(
            await screen.findByText('Tidak ada sesi lain. Akun Anda hanya masuk di perangkat ini.'),
        ).toBeVisible();
    });

    it('signs out every other device at once', async () => {
        let revokedOthers = false;
        server.use(
            http.get('*/api/v1/auth/sessions', () => envelope([current, phone])),
            http.delete('*/api/v1/auth/sessions', () => {
                revokedOthers = true;

                return envelope({ ended: 1 });
            }),
        );
        const user = userEvent.setup();
        renderApp('/account?tab=security');

        await user.click(
            await screen.findByRole('button', { name: 'Keluar dari semua perangkat lain' }),
        );
        const dialog = await screen.findByRole('alertdialog', {
            name: 'Keluar dari semua perangkat lain?',
        });
        expect(dialog).toHaveTextContent('1 sesi lain akan diakhiri');

        await user.click(
            within(dialog).getByRole('button', { name: 'Keluar dari perangkat lain' }),
        );

        expect(
            await screen.findByText('Semua sesi di perangkat lain telah diakhiri.'),
        ).toBeVisible();
        expect(revokedOthers).toBe(true);
    });
});

describe('email confirmation page', () => {
    const LINK = `/confirm-email#id=${makeUser().id}&token=${'t'.repeat(64)}`;

    it('confirms the new email only after the button is pressed', async () => {
        server.use(http.get('*/api/v1/auth/user', () => HttpResponse.json({}, { status: 401 })));
        const bodies: unknown[] = [];
        server.use(
            http.post('*/api/v1/auth/email-change/confirm', async ({ request }) => {
                bodies.push(await request.json());

                return envelope(null);
            }),
        );
        const user = userEvent.setup();
        renderApp(LINK);

        const button = await screen.findByRole('button', { name: 'Konfirmasi email' });
        expect(bodies).toEqual([]);

        await user.click(button);

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Email akun Anda telah diubah.',
        );
        expect(bodies).toEqual([{ id: makeUser().id, token: 't'.repeat(64) }]);
        expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/login');
    });

    it('explains a link that no longer works', async () => {
        server.use(
            http.post('*/api/v1/auth/email-change/confirm', () =>
                HttpResponse.json({ code: 'AUTH_EMAIL_CHANGE_INVALID' }, { status: 422 }),
            ),
        );
        const user = userEvent.setup();
        renderApp(LINK);

        await user.click(await screen.findByRole('button', { name: 'Konfirmasi email' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Tautan konfirmasi tidak berlaku.',
        );
    });

    it('says so when the link is incomplete', async () => {
        renderApp('/confirm-email');

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Tautan konfirmasi tidak lengkap.',
        );
        expect(screen.queryByRole('button', { name: 'Konfirmasi email' })).not.toBeInTheDocument();
    });
});

it('names common devices and falls back for unknown ones', () => {
    expect(
        describeUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
        ),
    ).toBe('Safari di macOS');
    expect(describeUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Firefox/120.0')).toBe(
        'Firefox di iOS',
    );
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Edg/120.0')).toBe(
        'Edge di Windows',
    );
    expect(describeUserAgent('curl/8.0')).toBe('Perangkat tidak dikenal');
    expect(describeUserAgent(null)).toBe('Perangkat tidak dikenal');
});
