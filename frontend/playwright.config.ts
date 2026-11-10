import { defineConfig, devices } from '@playwright/test';
import { BACKEND_PORT, backendEnv, FRONTEND_URL } from './e2e/environment.ts';

export default defineConfig({
    testDir: './e2e',
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    reporter: process.env.CI ? 'github' : 'list',
    globalSetup: './e2e/global-setup.ts',
    use: {
        baseURL: FRONTEND_URL,
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            command: `php artisan serve --host=127.0.0.1 --port=${BACKEND_PORT}`,
            cwd: '../backend',
            url: `http://127.0.0.1:${BACKEND_PORT}/api/v1/health`,
            env: backendEnv,
        },
        {
            // The built app is tested, not the dev server, so the test sees what users get.
            command: 'npm run build && npx vite preview --port 5173 --strictPort',
            url: FRONTEND_URL,
            env: { BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}` },
            timeout: 180_000,
        },
    ],
});
