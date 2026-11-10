import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';

function asUser(permissions: string[]) {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({
                success: true,
                message: '',
                data: makeUser(permissions),
                meta: null,
            }),
        ),
        http.get('*/api/v1/users/:id', () =>
            HttpResponse.json(
                { success: false, message: '', code: 'RESOURCE_NOT_FOUND', errors: null },
                { status: 404 },
            ),
        ),
    );
}

it('shows where a page sits and links to the pages above it', async () => {
    asUser(['user.view', 'user.update']);

    renderApp('/users/user-7/edit');

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    const links = within(breadcrumb).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['Beranda', '/'],
        ['Pengguna', '/users'],
        ['Detail pengguna', '/users/user-7'],
    ]);
    expect(within(breadcrumb).getByText('Ubah pengguna')).toHaveAttribute('aria-current', 'page');
});

it('shows only the page name on the home page', async () => {
    asUser([]);

    renderApp('/');

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).queryAllByRole('link')).toEqual([]);
    expect(within(breadcrumb).getByText('Beranda')).toHaveAttribute('aria-current', 'page');
});
