import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';

vi.mock('@/features/dashboard/pages/HomePage', () => ({
    HomePage: () => {
        throw new Error('render failed');
    },
}));

it('keeps the sidebar and header when a page fails to render', async () => {
    // React logs the thrown error; it is expected here and would only add noise.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ success: true, message: '', data: makeUser([]), meta: null }),
        ),
    );

    renderApp('/');

    expect(
        await screen.findByRole('heading', { name: 'Halaman ini gagal ditampilkan' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Muat ulang halaman' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Menu utama' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menu akun/ })).toBeInTheDocument();
});
