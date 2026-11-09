import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, it } from 'vitest';
import { server } from '@/test/server';
import { makeUser, renderApp } from '@/test/utils';

beforeEach(() => {
    server.use(
        http.get('*/api/v1/auth/user', () =>
            HttpResponse.json({ success: true, message: '', data: makeUser(), meta: null }),
        ),
    );
});

it('names the browser tab after the current page', async () => {
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Beranda' });

    expect(document.title).toBe('Beranda · Enterprise System');

    await act(() => router.navigate('/change-password'));
    await screen.findByRole('heading', { name: 'Ubah password' });

    expect(document.title).toBe('Ubah password · Enterprise System');
});

it('moves focus to the content after navigating', async () => {
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Beranda' });

    await act(() => router.navigate('/change-password'));

    await waitFor(() => expect(document.getElementById('main-content')).toHaveFocus());
});

it('leaves focus alone on the first page', async () => {
    renderApp('/reset-password');
    await screen.findByRole('heading', { name: 'Buat password baru' });

    expect(document.getElementById('main-content')).not.toHaveFocus();
});
