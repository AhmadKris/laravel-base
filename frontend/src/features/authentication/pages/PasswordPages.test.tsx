import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';

const NEW_PASSWORD = 'kata-sandi-baru-123';

function asGuest() {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ code: 'AUTH_UNAUTHENTICATED' }, { status: 401 }),
        ),
    );
}

function asUser() {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ success: true, message: '', data: makeUser(), meta: null }),
        ),
    );
}

const success = () => HttpResponse.json({ success: true, message: '', data: null, meta: null });

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

describe('forgot password page', () => {
    it('shows the same neutral confirmation after sending the request', async () => {
        asGuest();
        let body: unknown;
        server.use(
            http.post('*/api/v1/auth/forgot-password', async ({ request }) => {
                body = await request.json();

                return success();
            }),
        );

        renderApp('/forgot-password');
        await userEvent.type(await screen.findByLabelText('Email'), 'ani@example.com');
        await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan reset' }));

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Jika email tersebut terdaftar',
        );
        expect(body).toEqual({ email: 'ani@example.com' });
    });

    it('rejects an invalid email before calling the server', async () => {
        asGuest();

        renderApp('/forgot-password');
        await userEvent.type(await screen.findByLabelText('Email'), 'bukan-email');
        await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan reset' }));

        expect(await screen.findByText('Masukkan alamat email yang valid.')).toBeVisible();
    });
});

describe('reset password page', () => {
    async function submitNewPassword(password: string, confirmation: string) {
        await userEvent.type(await screen.findByLabelText('Password baru'), password);
        await userEvent.type(screen.getByLabelText('Ulangi password baru'), confirmation);
        await userEvent.click(screen.getByRole('button', { name: 'Simpan password baru' }));
    }

    it('sends the token and email from the link fragment, then opens login', async () => {
        asGuest();
        let body: unknown;
        server.use(
            http.post('*/api/v1/auth/reset-password', async ({ request }) => {
                body = await request.json();

                return success();
            }),
        );

        const router = renderApp('/reset-password#token=abc123&email=ani%2Btim%40example.com');
        expect(await screen.findByText('Untuk akun ani+tim@example.com')).toBeVisible();
        await submitNewPassword(NEW_PASSWORD, NEW_PASSWORD);

        expect(
            await screen.findByRole('heading', { name: 'Masuk ke Enterprise System' }),
        ).toBeVisible();
        expect(router.state.location.pathname).toBe('/login');
        expect(await screen.findByText(/Password berhasil diganti/)).toBeVisible();
        expect(body).toEqual({
            token: 'abc123',
            email: 'ani+tim@example.com',
            password: NEW_PASSWORD,
            password_confirmation: NEW_PASSWORD,
        });
    });

    it('still opens for a signed-in browser and ends the local session after reset', async () => {
        asUser();
        server.use(http.post('*/api/v1/auth/reset-password', success));

        const router = renderApp('/reset-password#token=abc123&email=ani@example.com');
        await submitNewPassword(NEW_PASSWORD, NEW_PASSWORD);

        expect(
            await screen.findByRole('heading', { name: 'Masuk ke Enterprise System' }),
        ).toBeVisible();
        expect(router.state.location.pathname).toBe('/login');
    });

    it.each([
        ['token', '#email=ani@example.com'],
        ['email', '#token=abc123'],
        ['fragment', ''],
    ])('shows no form when the link is missing its %s', async (_part, fragment) => {
        asGuest();

        renderApp(`/reset-password${fragment}`);

        expect(await screen.findByRole('alert')).toHaveTextContent('Tautan reset password');
        expect(screen.queryByLabelText('Password baru')).not.toBeInTheDocument();
    });

    it('explains an expired or used link', async () => {
        asGuest();
        server.use(
            http.post('*/api/v1/auth/reset-password', () =>
                HttpResponse.json({ code: 'AUTH_PASSWORD_RESET_INVALID' }, { status: 422 }),
            ),
        );

        renderApp('/reset-password#token=abc123&email=ani@example.com');
        await submitNewPassword(NEW_PASSWORD, NEW_PASSWORD);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Tautan reset password tidak valid atau sudah kedaluwarsa.',
        );
        expect(screen.getByRole('link', { name: 'Minta tautan baru' })).toBeVisible();
    });

    it('requires 12 characters and a matching confirmation', async () => {
        asGuest();

        renderApp('/reset-password#token=abc123&email=ani@example.com');
        await submitNewPassword('pendek', 'berbeda');

        expect(await screen.findByText('Password minimal 12 karakter.')).toBeVisible();

        await userEvent.clear(screen.getByLabelText('Password baru'));
        await userEvent.type(screen.getByLabelText('Password baru'), NEW_PASSWORD);
        await userEvent.click(screen.getByRole('button', { name: 'Simpan password baru' }));

        expect(await screen.findByText('Konfirmasi password tidak sama.')).toBeVisible();
    });
});

describe('change password page', () => {
    async function submitChange(current: string) {
        await userEvent.type(await screen.findByLabelText('Password saat ini'), current);
        await userEvent.type(screen.getByLabelText('Password baru'), NEW_PASSWORD);
        await userEvent.type(screen.getByLabelText('Ulangi password baru'), NEW_PASSWORD);
        await userEvent.click(screen.getByRole('button', { name: 'Simpan password' }));
    }

    it('changes the password, confirms it, and empties the form', async () => {
        asUser();
        let body: unknown;
        server.use(
            http.post('*/api/v1/auth/change-password', async ({ request }) => {
                body = await request.json();

                return success();
            }),
        );

        renderApp('/change-password');
        await submitChange('password-lama-123');

        expect(await screen.findByText(/Password berhasil diubah/)).toBeVisible();
        expect(body).toEqual({
            current_password: 'password-lama-123',
            password: NEW_PASSWORD,
            password_confirmation: NEW_PASSWORD,
        });
        await waitFor(() => expect(screen.getByLabelText('Password saat ini')).toHaveValue(''));
        expect(screen.getByLabelText('Password baru')).toHaveValue('');
    });

    it('shows each validation error from the backend on its field', async () => {
        asUser();
        server.use(
            http.post('*/api/v1/auth/change-password', () =>
                HttpResponse.json(
                    {
                        code: 'VALIDATION_FAILED',
                        errors: {
                            current_password: ['Password saat ini salah.'],
                            password: ['Password ini pernah muncul di kebocoran data.'],
                        },
                    },
                    { status: 422 },
                ),
            ),
        );

        renderApp('/change-password');
        await submitChange('password-lama-123');

        expect(await screen.findByText('Password saat ini salah.')).toBeVisible();
        expect(screen.getByText('Password ini pernah muncul di kebocoran data.')).toBeVisible();
        expect(screen.getByLabelText('Password saat ini')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Password baru')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Password saat ini')).toHaveFocus();
    });

    it('is reachable from the account menu', async () => {
        asUser();

        const router = renderApp('/');
        await userEvent.click(await screen.findByRole('button', { name: /Menu akun/ }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Ubah password' }));

        expect(await screen.findByRole('heading', { name: 'Ubah password' })).toBeVisible();
        expect(router.state.location.pathname).toBe('/change-password');
    });
});
