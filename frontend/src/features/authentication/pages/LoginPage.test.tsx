import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';

const envelope = (data: unknown) =>
    HttpResponse.json({ success: true, message: '', data, meta: null });

function asGuest() {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ code: 'AUTH_UNAUTHENTICATED' }, { status: 401 }),
        ),
    );
}

async function submitLogin(email: string, password: string) {
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Email'), email);
    await user.type(screen.getByLabelText('Password'), password);
    await user.click(screen.getByRole('button', { name: 'Masuk ke aplikasi' }));
}

describe('login page', () => {
    beforeEach(() => {
        document.cookie = 'XSRF-TOKEN=existing; path=/';
    });

    it('signs in with the entered credentials and opens the home page', async () => {
        asGuest();
        let body: unknown;
        server.use(
            http.post('*/login', async ({ request }) => {
                body = await request.json();

                return envelope(makeUser());
            }),
        );

        const router = renderApp('/login');
        await submitLogin('ani@example.com', 'rahasia');

        expect(await screen.findByRole('heading', { name: 'Beranda' })).toBeVisible();
        expect(router.state.location.pathname).toBe('/');
        expect(body).toEqual({ email: 'ani@example.com', password: 'rahasia' });
    });

    it('returns to the page a guest originally asked for', async () => {
        asGuest();
        server.use(http.post('*/login', () => envelope(makeUser())));

        const router = renderApp('/change-password');
        await submitLogin('ani@example.com', 'rahasia');

        expect(await screen.findByRole('heading', { name: 'Ubah password' })).toBeVisible();
        expect(router.state.location.pathname).toBe('/change-password');
    });

    it('shows the message for the backend code and stays on the page', async () => {
        asGuest();
        server.use(
            http.post('*/login', () =>
                HttpResponse.json(
                    { code: 'AUTH_INVALID_CREDENTIALS', message: 'Backend wording' },
                    { status: 401 },
                ),
            ),
        );

        const router = renderApp('/login');
        await submitLogin('ani@example.com', 'salah');

        expect(await screen.findByRole('alert')).toHaveTextContent('Email atau password salah.');
        expect(screen.queryByText('Backend wording')).not.toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/login');
        expect(screen.getByRole('button', { name: 'Masuk ke aplikasi' })).toBeEnabled();
    });

    it('clears the previous error on the next attempt', async () => {
        asGuest();
        let attempts = 0;
        server.use(
            http.post('*/login', () => {
                attempts += 1;

                return attempts === 1
                    ? HttpResponse.json({ code: 'AUTH_INVALID_CREDENTIALS' }, { status: 401 })
                    : envelope(makeUser());
            }),
        );

        renderApp('/login');
        await submitLogin('ani@example.com', 'salah');
        await screen.findByRole('alert');
        await userEvent.click(screen.getByRole('button', { name: 'Masuk ke aplikasi' }));

        expect(await screen.findByRole('heading', { name: 'Beranda' })).toBeVisible();
    });

    it('shows backend validation errors on their fields', async () => {
        asGuest();
        server.use(
            http.post('*/login', () =>
                HttpResponse.json(
                    { code: 'VALIDATION_FAILED', errors: { email: ['Email ditolak server.'] } },
                    { status: 422 },
                ),
            ),
        );

        renderApp('/login');
        await submitLogin('ani@example.com', 'rahasia');

        expect(await screen.findByText('Email ditolak server.')).toBeVisible();
        expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Email')).toHaveFocus();
    });

    it('explains when attempts are rate limited', async () => {
        asGuest();
        server.use(
            http.post('*/login', () =>
                HttpResponse.json({ code: 'TOO_MANY_REQUESTS' }, { status: 429 }),
            ),
        );

        renderApp('/login');
        await submitLogin('ani@example.com', 'rahasia');

        expect(await screen.findByRole('alert')).toHaveTextContent('Terlalu banyak percobaan.');
    });

    it('does not call the server when the form is invalid', async () => {
        asGuest();
        let called = false;
        server.use(
            http.post('*/login', () => {
                called = true;

                return envelope(makeUser());
            }),
        );

        renderApp('/login');
        await userEvent.click(await screen.findByRole('button', { name: 'Masuk ke aplikasi' }));

        expect(await screen.findByText('Masukkan alamat email yang valid.')).toBeVisible();
        expect(screen.getByText('Password wajib diisi.')).toBeVisible();
        expect(called).toBe(false);
    });

    it('disables the button while signing in', async () => {
        asGuest();
        server.use(
            http.post('*/login', async () => {
                await delay(50);

                return envelope(makeUser());
            }),
        );

        renderApp('/login');
        await submitLogin('ani@example.com', 'rahasia');

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Masuk ke aplikasi' })).toBeDisabled(),
        );
        await screen.findByRole('heading', { name: 'Beranda' });
    });

    it('sends a signed-in user away from the login page', async () => {
        server.use(http.get('*/api/v1/auth/user', () => envelope(makeUser())));

        const router = renderApp('/login');

        expect(await screen.findByRole('heading', { name: 'Beranda' })).toBeVisible();
        expect(router.state.location.pathname).toBe('/');
    });
});

describe('after signing out', () => {
    it('opens the home page on the next login, not the last visited page', async () => {
        document.cookie = 'XSRF-TOKEN=existing; path=/';
        server.use(
            http.get('*/api/v1/auth/user', () => envelope(makeUser())),
            http.post('*/logout', () => new HttpResponse(null, { status: 204 })),
            http.post('*/login', () => envelope(makeUser())),
        );

        const router = renderApp('/change-password');
        await userEvent.click(await screen.findByRole('button', { name: /Menu akun/ }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Keluar' }));
        await screen.findByRole('heading', { name: 'Masuk' });
        await submitLogin('budi@example.com', 'rahasia');

        expect(await screen.findByRole('heading', { name: 'Beranda' })).toBeVisible();
        expect(router.state.location.pathname).toBe('/');
    });
});
