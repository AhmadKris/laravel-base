import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { makeUser } from '@/test/utils';
import { server } from '@/test/server';
import { App } from './App';

it('shows the home page with the profile from the backend', async () => {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ success: true, message: '', data: makeUser(), meta: null }),
        ),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Beranda' })).toBeInTheDocument();
    expect(screen.getByText('ani@example.com')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
});

it('sends a guest away from protected pages without looping', async () => {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ success: false, code: 'AUTH_UNAUTHENTICATED' }, { status: 401 }),
        ),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
    expect(window.location.pathname).toBe('/login');
});
