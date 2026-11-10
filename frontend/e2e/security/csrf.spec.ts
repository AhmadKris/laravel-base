import { expect, type Page, test } from '@playwright/test';
import { E2E_PASSWORD, E2E_USERNAME, FRONTEND_URL } from '../environment.ts';

/*
 * The backend test suite skips CSRF checks, so the protection is proven here with a real session.
 * Laravel accepts a request without a token when the browser reports Sec-Fetch-Site: same-origin.
 * Browsers set that header themselves and scripts cannot change it, so another site can never send it.
 */

async function logIn(page: Page): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Email atau username').fill(E2E_USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Masuk ke aplikasi' }).click();
    await expect(page.getByRole('heading', { name: 'Beranda' })).toBeVisible();
}

async function changePassword(page: Page, headers: Record<string, string>) {
    // page.request carries the session cookie of the logged in page.
    const response = await page.request.post('/api/v1/auth/change-password', {
        headers: { Accept: 'application/json', ...headers },
        data: {},
    });
    const body = (await response.json()) as { code?: string };

    return { status: response.status(), code: body.code };
}

test('a request from another site cannot change data with the session of the user', async ({
    page,
}) => {
    await logIn(page);

    expect(
        await changePassword(page, { Origin: FRONTEND_URL, 'Sec-Fetch-Site': 'cross-site' }),
        'the browser reports another site and no token is sent',
    ).toEqual({ status: 419, code: 'CSRF_TOKEN_MISMATCH' });

    expect(
        await changePassword(page, { Origin: FRONTEND_URL }),
        'a client that sends no fetch metadata still needs the token',
    ).toEqual({ status: 419, code: 'CSRF_TOKEN_MISMATCH' });

    expect(
        await changePassword(page, {
            Origin: 'https://evil.example',
            'Sec-Fetch-Site': 'cross-site',
        }),
        'another origin does not get the session at all',
    ).toEqual({ status: 401, code: 'AUTH_UNAUTHENTICATED' });

    expect(
        await changePassword(page, { Origin: FRONTEND_URL, 'Sec-Fetch-Site': 'same-origin' }),
        'the app itself reaches validation, so the session was valid',
    ).toEqual({ status: 422, code: 'VALIDATION_FAILED' });
});
