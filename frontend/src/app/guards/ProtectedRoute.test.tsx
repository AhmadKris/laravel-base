import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { server } from '@/test/server';
import { makeUser } from '@/test/utils';
import { ProtectedRoute } from './ProtectedRoute';

function LoginProbe() {
    const location = useLocation();
    const from = (location.state as { from: { pathname: string } }).from.pathname;

    return <p>login page from {from}</p>;
}

function renderRoute(requiredPermission?: string) {
    const router = createMemoryRouter(
        [
            {
                path: '/users',
                element: (
                    <ProtectedRoute requiredPermission={requiredPermission}>
                        <p>protected content</p>
                    </ProtectedRoute>
                ),
            },
            { path: '/login', element: <LoginProbe /> },
            { path: '/', element: <p>home</p> },
        ],
        { initialEntries: ['/users'] },
    );

    render(<RouterProvider router={router} />);
}

it('waits while the session is being checked', () => {
    renderRoute();

    expect(screen.getByRole('status', { name: 'Memeriksa sesi' })).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
});

it('redirects a guest to login and remembers the page', () => {
    useAuthStore.getState().setGuest();

    renderRoute('user.view');

    expect(screen.getByText('login page from /users')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
});

it('shows the forbidden page without the required permission', () => {
    useAuthStore.getState().setUser(makeUser(['role.view']));

    renderRoute('user.view');

    expect(screen.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
});

it('shows the page with the required permission', () => {
    useAuthStore.getState().setUser(makeUser(['user.view']));

    renderRoute('user.view');

    expect(screen.getByText('protected content')).toBeInTheDocument();
});

it('allows any signed-in user when no permission is required', () => {
    useAuthStore.getState().setUser(makeUser());

    renderRoute();

    expect(screen.getByText('protected content')).toBeInTheDocument();
});

it('offers a retry when the session cannot be checked', async () => {
    useAuthStore.getState().setUnavailable();
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ success: true, message: '', data: makeUser(), meta: null }),
        ),
    );
    const user = userEvent.setup();

    renderRoute();

    expect(screen.getByRole('alert')).toHaveTextContent('Sesi tidak dapat diperiksa');

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(await screen.findByText('protected content')).toBeInTheDocument();
});
