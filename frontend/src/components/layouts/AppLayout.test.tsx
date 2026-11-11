import { QueryClient } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { useAuthStore } from '@/stores/auth-store';
import { server } from '@/test/server';
import { makeUser, renderWithProviders } from '@/test/utils';
import { AppLayout } from './AppLayout';

function renderLayout(permissions: string[], queryClient?: QueryClient, initialPath = '/') {
    useAuthStore.getState().setUser(makeUser(permissions));

    const router = createMemoryRouter(
        [
            {
                element: (
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                ),
                children: [
                    { path: '/', element: <p>page content</p> },
                    { path: '/users', element: <p>users page</p> },
                    { path: '/users/new', element: <p>new user page</p> },
                    { path: '/roles', element: <p>roles page</p> },
                ],
            },
            { path: '/login', element: <p>login page</p> },
        ],
        { initialEntries: [initialPath] },
    );

    const view = renderWithProviders(<RouterProvider router={router} />, queryClient);

    return { router, unmount: view.unmount };
}

function menuLabels(): string[] {
    const menu = screen.getByRole('navigation', { name: 'Menu utama' });

    return within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent ?? '');
}

beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=existing; path=/';
});

afterEach(() => {
    localStorage.removeItem('sidebar_collapsed_sections');
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

it('remembers a collapsed sidebar', () => {
    document.cookie = 'sidebar_state=false; path=/';
    renderLayout([]);

    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
        'data-state',
        'collapsed',
    );

    document.cookie = 'sidebar_state=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

function sidebarState(): string | null {
    return document.querySelector('[data-slot="sidebar"]')?.getAttribute('data-state') ?? null;
}

describe('at tablet width', () => {
    const desktopWidth = window.innerWidth;
    const originalMatchMedia = window.matchMedia;
    const widthListeners = new Set<() => void>();

    const resizeTo = (width: number) => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            writable: true,
            value: width,
        });
        act(() => widthListeners.forEach((listener) => listener()));
    };

    beforeEach(() => {
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            addEventListener: (_type: string, listener: () => void) => widthListeners.add(listener),
            removeEventListener: (_type: string, listener: () => void) =>
                widthListeners.delete(listener),
        })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            writable: true,
            value: desktopWidth,
        });
        window.matchMedia = originalMatchMedia;
        widthListeners.clear();
        document.cookie = 'sidebar_state=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });

    it('starts as icons and opens without changing the desktop preference', async () => {
        document.cookie = 'sidebar_state=false; path=/';
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            writable: true,
            value: 800,
        });
        const user = userEvent.setup();
        renderLayout(['user.view']);

        expect(sidebarState()).toBe('collapsed');
        expect(screen.getByRole('link', { name: 'Pengguna' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Buka atau tutup menu' }));

        expect(sidebarState()).toBe('expanded');
        expect(document.cookie).toContain('sidebar_state=false');
    });

    it('collapses when a desktop window shrinks and restores the desktop choice after', () => {
        renderLayout([]);
        expect(sidebarState()).toBe('expanded');

        resizeTo(800);
        expect(sidebarState()).toBe('collapsed');

        resizeTo(desktopWidth);
        expect(sidebarState()).toBe('expanded');
    });
});

it('groups administration items under a heading', () => {
    renderLayout(['user.view']);

    expect(screen.getByRole('button', { name: 'Administrasi' })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
});

it('hides a heading with no visible items', () => {
    renderLayout([]);

    expect(screen.queryByText('Administrasi')).not.toBeInTheDocument();
});

it('collapses and expands a menu section and remembers the preference', async () => {
    const user = userEvent.setup();
    const { unmount } = renderLayout(['user.view', 'role.view']);

    const toggle = screen.getByRole('button', { name: 'Administrasi' });
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Pengguna' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beranda' })).toBeInTheDocument();

    unmount();
    renderLayout(['user.view', 'role.view']);

    expect(screen.getByRole('button', { name: 'Administrasi' })).toHaveAttribute(
        'aria-expanded',
        'false',
    );
    expect(screen.queryByRole('link', { name: 'Pengguna' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Administrasi' }));

    expect(screen.getByRole('button', { name: 'Administrasi' })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
    expect(screen.getByRole('link', { name: 'Pengguna' })).toBeInTheDocument();
});

it('automatically expands a collapsed section when its route is active', async () => {
    localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(['administration']));
    renderLayout(['user.view'], undefined, '/users');

    expect(screen.getByRole('button', { name: 'Administrasi' })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
    expect(screen.getByRole('link', { name: 'Pengguna' })).toBeInTheDocument();
});

it('auto-expands on route entry while allowing manual collapse within the section', async () => {
    const user = userEvent.setup();
    const { router } = renderLayout(['user.view', 'role.view']);

    await user.click(screen.getByRole('button', { name: 'Administrasi' }));
    expect(screen.queryByRole('link', { name: 'Pengguna' })).not.toBeInTheDocument();

    await act(async () => {
        await router.navigate('/users');
    });

    expect(screen.getByRole('button', { name: 'Administrasi' })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
    expect(screen.getByRole('link', { name: 'Pengguna' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Administrasi' }));
    expect(screen.queryByRole('link', { name: 'Pengguna' })).not.toBeInTheDocument();

    await act(async () => {
        await router.navigate('/users/new');
    });

    expect(screen.getByRole('button', { name: 'Administrasi' })).toHaveAttribute(
        'aria-expanded',
        'false',
    );
});

it('keeps section items reachable in icon mode even if collapsed in desktop view', async () => {
    localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(['administration']));
    document.cookie = 'sidebar_state=false; path=/';
    const user = userEvent.setup();

    renderLayout(['user.view']);

    expect(sidebarState()).toBe('collapsed');
    expect(screen.getByRole('link', { name: 'Pengguna' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buka atau tutup menu' }));

    expect(sidebarState()).toBe('expanded');
    expect(screen.getByRole('button', { name: 'Administrasi' })).toHaveAttribute(
        'aria-expanded',
        'false',
    );
    expect(screen.queryByRole('link', { name: 'Pengguna' })).not.toBeInTheDocument();

    document.cookie = 'sidebar_state=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

it('closes the mobile menu after choosing a page', async () => {
    const desktopWidth = window.innerWidth;
    window.innerWidth = 375;
    const user = userEvent.setup();
    renderLayout(['user.view']);

    await user.click(screen.getByRole('button', { name: 'Buka atau tutup menu' }));
    await user.click(await screen.findByRole('link', { name: 'Beranda' }));

    await waitFor(() =>
        expect(screen.queryByRole('link', { name: 'Beranda' })).not.toBeInTheDocument(),
    );

    window.innerWidth = desktopWidth;
});

it('shows account details in the user menu dropdown', async () => {
    const user = userEvent.setup();
    renderLayout([]);

    await user.click(screen.getByRole('button', { name: /Menu akun/ }));

    expect(await screen.findByText('ani@example.com')).toBeVisible();
    expect(screen.getByText('Staff')).toBeVisible();
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
