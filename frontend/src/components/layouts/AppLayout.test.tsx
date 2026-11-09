import { QueryClient } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, expect, it } from 'vitest';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { useAuthStore } from '@/stores/auth-store';
import { server } from '@/test/server';
import { makeUser, renderWithProviders } from '@/test/utils';
import { AppLayout } from './AppLayout';

function renderLayout(permissions: string[], queryClient?: QueryClient) {
    useAuthStore.getState().setUser(makeUser(permissions));

    const router = createMemoryRouter([
        {
            element: (
                <ProtectedRoute>
                    <AppLayout />
                </ProtectedRoute>
            ),
            children: [{ path: '/', element: <p>page content</p> }],
        },
        { path: '/login', element: <p>login page</p> },
    ]);

    renderWithProviders(<RouterProvider router={router} />, queryClient);
}

function menuLabels(): string[] {
    const menu = screen.getByRole('list', { name: 'Menu utama' });

    return within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent ?? '');
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

it('shows only the menu items allowed by the backend permissions', () => {
    renderLayout(['user.view', 'audit.view']);

    expect(menuLabels()).toEqual(['Beranda', 'Pengguna', 'Audit Log']);
});

it('shows only the home item without permissions', () => {
    renderLayout([]);

    expect(menuLabels()).toEqual(['Beranda']);
});

it('renders the page inside the layout', () => {
    renderLayout([]);

    expect(screen.getByRole('main')).toHaveTextContent('page content');
});

it('reaches the skip link first with the keyboard', async () => {
    const user = userEvent.setup();
    renderLayout([]);

    await user.tab();

    expect(screen.getByRole('link', { name: 'Lewati ke konten utama' })).toHaveFocus();
});

it('logs out with the keyboard and returns to login', async () => {
    let loggedOut = false;
    server.use(
        http.post('*/logout', () => {
            loggedOut = true;

            return new HttpResponse(null, { status: 204 });
        }),
    );
    const user = userEvent.setup();
    renderLayout([]);

    screen.getByRole('button', { name: /Menu akun/ }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Keluar' }));

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(loggedOut).toBe(true);
    expect(useAuthStore.getState().status).toBe('signed-out');
});

it('removes cached data when the user logs out', async () => {
    server.use(http.post('*/logout', () => new HttpResponse(null, { status: 204 })));
    const queryClient = new QueryClient();
    queryClient.setQueryData(['users'], ['data pengguna sebelumnya']);
    const user = userEvent.setup();
    renderLayout([], queryClient);

    await user.click(screen.getByRole('button', { name: /Menu akun/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Keluar' }));
    await screen.findByText('login page');

    expect(queryClient.getQueryData(['users'])).toBeUndefined();
});

it('keeps the session and reports a failed logout', async () => {
    server.use(
        http.post('*/logout', () =>
            HttpResponse.json({ code: 'SYSTEM_INTERNAL_ERROR' }, { status: 500 }),
        ),
    );
    const user = userEvent.setup();
    renderLayout([]);

    await user.click(screen.getByRole('button', { name: /Menu akun/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Keluar' }));

    expect(await screen.findByText('page content')).toBeInTheDocument();
    expect(useAuthStore.getState().status).toBe('authenticated');
});
