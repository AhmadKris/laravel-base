import { expect, test } from '@playwright/test';
import { E2E_PASSWORD, E2E_USERNAME } from '../environment.ts';

test('a guest is sent to the login page', async ({ page }) => {
    await page.goto('/users');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /^Masuk ke / })).toBeVisible();
});

test('a user logs in, reaches the home page, and logs out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email atau username').fill(E2E_USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Masuk ke aplikasi' }).click();

    await expect(page.getByRole('heading', { name: 'Beranda' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Pengguna' })).toBeVisible();

    await page.getByRole('button', { name: /Menu akun/ }).click();
    await page.getByRole('menuitem', { name: 'Keluar' }).click();

    await expect(page.getByRole('heading', { name: /^Masuk ke / })).toBeVisible();
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login$/);
});

test('a wrong password keeps the user on the login page with a message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email atau username').fill(E2E_USERNAME);
    await page.getByLabel('Password', { exact: true }).fill(`${E2E_PASSWORD}-salah`);
    await page.getByRole('button', { name: 'Masuk ke aplikasi' }).click();

    await expect(page.getByRole('alert')).toContainText('Email atau password salah.');
    await expect(page).toHaveURL(/\/login$/);
});
