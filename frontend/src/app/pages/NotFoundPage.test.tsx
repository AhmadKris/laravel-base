import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';

function asUser(permissions: string[] = []) {
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

function asGuest() {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ code: 'AUTH_UNAUTHENTICATED' }, { status: 401 }),
        ),
    );
}

it('keeps the application menu for a signed-in user and names the address', async () => {
    asUser(['user.view']);

    renderApp('/alamat-salah');

    expect(await screen.findByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
    expect(screen.getByText('/alamat-salah')).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Menu utama' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/');
});

it('offers the login page to a guest without the application menu', async () => {
    asGuest();

    renderApp('/alamat-salah');

    expect(await screen.findByRole('link', { name: 'Ke halaman masuk' })).toHaveAttribute(
        'href',
        '/login',
    );
    expect(screen.queryByRole('navigation', { name: 'Menu utama' })).not.toBeInTheDocument();
});

it('shows a skeleton until the session is known', async () => {
    server.use(
        http.get('*/api/v1/auth/user', async () => {
            await delay(50);

            return HttpResponse.json({ code: 'AUTH_UNAUTHENTICATED' }, { status: 401 });
        }),
    );

    renderApp('/alamat-salah');

    expect(screen.getByRole('status', { name: 'Memeriksa sesi' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Halaman tidak ditemukan' });
});

it('hides the back button when there is no previous page', async () => {
    asUser();

    renderApp('/alamat-salah');

    await screen.findByRole('heading', { name: 'Halaman tidak ditemukan' });
    expect(screen.queryByRole('button', { name: 'Halaman sebelumnya' })).not.toBeInTheDocument();
});

it('returns to the previous page', async () => {
    asUser();
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Beranda' });

    await act(() => router.navigate('/alamat-salah'));
    await userEvent.click(await screen.findByRole('button', { name: 'Halaman sebelumnya' }));

    expect(await screen.findByRole('heading', { name: 'Beranda' })).toBeVisible();
});
