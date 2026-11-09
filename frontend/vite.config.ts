import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { ProxyOptions } from 'vite';
import { defineConfig } from 'vitest/config';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';

const backendProxy: ProxyOptions = { target: backendUrl };

// /login is also a React page, so only non-GET requests may reach Laravel.
const sessionProxy: ProxyOptions = {
    target: backendUrl,
    bypass: (request) => (request.method === 'GET' ? '/index.html' : undefined),
};

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api/': backendProxy,
            '/sanctum/': backendProxy,
            '^/login$': sessionProxy,
            '^/logout$': sessionProxy,
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
