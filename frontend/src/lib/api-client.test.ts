import type { InternalAxiosRequestConfig } from 'axios';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { apiClient, setUnauthenticatedHandler } from './api-client';
import { ApiError } from './api-error';

const csrfCookie = () => {
    document.cookie = 'XSRF-TOKEN=token-from-server; path=/';

    return new HttpResponse(null, { status: 204 });
};

afterEach(() => setUnauthenticatedHandler(() => undefined));

async function captureError(request: Promise<unknown>): Promise<ApiError> {
    const error = await request.catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);

    return error as ApiError;
}

describe('csrf handling', () => {
    it('attaches the session cookie and csrf token when the api is on another origin', async () => {
        const adapter = vi.fn((config: InternalAxiosRequestConfig) =>
            Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config }),
        );

        await apiClient.get('/departments', { adapter });

        expect(adapter.mock.calls[0]?.[0]).toMatchObject({
            withCredentials: true,
            withXSRFToken: true,
        });
    });

    it('loads the csrf cookie before the first change and sends the token', async () => {
        const calls: string[] = [];
        let tokenHeader: string | null = null;

        server.use(
            http.get('*/sanctum/csrf-cookie', () => {
                calls.push('csrf');

                return csrfCookie();
            }),
            http.post('*/api/v1/departments', ({ request }) => {
                calls.push('post');
                tokenHeader = request.headers.get('x-xsrf-token');

                return HttpResponse.json({});
            }),
        );

        await apiClient.post('/departments', {});

        expect(calls).toEqual(['csrf', 'post']);
        expect(tokenHeader).toBe('token-from-server');
    });

    it('does not load the csrf cookie for reads', async () => {
        const csrf = vi.fn(csrfCookie);

        server.use(
            http.get('*/sanctum/csrf-cookie', csrf),
            http.get('*/api/v1/departments', () => HttpResponse.json({})),
        );

        await apiClient.get('/departments');

        expect(csrf).not.toHaveBeenCalled();
    });

    it('reuses an existing csrf cookie', async () => {
        document.cookie = 'XSRF-TOKEN=existing; path=/';
        const csrf = vi.fn(csrfCookie);

        server.use(
            http.get('*/sanctum/csrf-cookie', csrf),
            http.post('*/api/v1/departments', () => HttpResponse.json({})),
        );

        await apiClient.post('/departments', {});

        expect(csrf).not.toHaveBeenCalled();
    });

    it('refreshes an expired token and retries once', async () => {
        document.cookie = 'XSRF-TOKEN=expired; path=/';
        let attempts = 0;

        server.use(
            http.get('*/sanctum/csrf-cookie', csrfCookie),
            http.post('*/api/v1/departments', () => {
                attempts += 1;

                return attempts === 1
                    ? HttpResponse.json({ code: 'CSRF_TOKEN_MISMATCH' }, { status: 419 })
                    : HttpResponse.json({ ok: true });
            }),
        );

        const response = await apiClient.post('/departments', {});

        expect(response.data).toEqual({ ok: true });
        expect(attempts).toBe(2);
    });

    it('stops after the retry also fails', async () => {
        document.cookie = 'XSRF-TOKEN=expired; path=/';
        let attempts = 0;

        server.use(
            http.get('*/sanctum/csrf-cookie', csrfCookie),
            http.post('*/api/v1/departments', () => {
                attempts += 1;

                return HttpResponse.json({ code: 'CSRF_TOKEN_MISMATCH' }, { status: 419 });
            }),
        );

        const error = await captureError(apiClient.post('/departments', {}));

        expect(error.code).toBe('CSRF_TOKEN_MISMATCH');
        expect(attempts).toBe(2);
    });
});

describe('error handling', () => {
    it.each([
        [403, 'AUTH_FORBIDDEN', 'Anda tidak memiliki izin untuk melakukan tindakan ini.'],
        [404, 'RESOURCE_NOT_FOUND', 'Data tidak ditemukan.'],
        [
            409,
            'RESOURCE_VERSION_CONFLICT',
            'Data telah diubah oleh pengguna lain. Muat ulang lalu simpan kembali.',
        ],
    ])('turns a %i response into a localized error', async (status, code, message) => {
        server.use(http.get('*/api/v1/sample', () => HttpResponse.json({ code }, { status })));

        const error = await captureError(apiClient.get('/sample'));

        expect(error).toMatchObject({ status, code, message });
    });

    it('never shows an unknown server message', async () => {
        server.use(
            http.get('*/api/v1/sample', () =>
                HttpResponse.json(
                    { code: 'NEW_CODE', message: 'Internal detail' },
                    { status: 409 },
                ),
            ),
        );

        const error = await captureError(apiClient.get('/sample'));

        expect(error.message).toBe('Permintaan tidak dapat diproses. Coba lagi beberapa saat.');
    });

    it('keeps validation errors per field', async () => {
        server.use(
            http.post('*/api/v1/sample', () =>
                HttpResponse.json(
                    { code: 'VALIDATION_FAILED', errors: { email: ['Email sudah dipakai.'] } },
                    { status: 422 },
                ),
            ),
        );
        document.cookie = 'XSRF-TOKEN=existing; path=/';

        const error = await captureError(apiClient.post('/sample', {}));

        expect(error.fieldErrors).toEqual({ email: ['Email sudah dipakai.'] });
    });

    it('reads the retry delay and request id', async () => {
        server.use(
            http.get('*/api/v1/sample', () =>
                HttpResponse.json(
                    { code: 'TOO_MANY_REQUESTS' },
                    { status: 429, headers: { 'Retry-After': '30', 'X-Request-ID': 'req-1' } },
                ),
            ),
        );

        const error = await captureError(apiClient.get('/sample'));

        expect(error.retryAfterSeconds).toBe(30);
        expect(error.requestId).toBe('req-1');
    });

    it('reports a network failure', async () => {
        server.use(http.get('*/api/v1/sample', () => HttpResponse.error()));

        const error = await captureError(apiClient.get('/sample'));

        expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    });

    it('signals an expired session', async () => {
        const handler = vi.fn();
        setUnauthenticatedHandler(handler);
        server.use(
            http.get('*/api/v1/sample', () =>
                HttpResponse.json({ code: 'AUTH_UNAUTHENTICATED' }, { status: 401 }),
            ),
        );

        await captureError(apiClient.get('/sample'));

        expect(handler).toHaveBeenCalledOnce();
    });

    it('does not treat a failed login as an expired session', async () => {
        const handler = vi.fn();
        setUnauthenticatedHandler(handler);
        document.cookie = 'XSRF-TOKEN=existing; path=/';
        server.use(
            http.post('*/login', () =>
                HttpResponse.json({ code: 'AUTH_INVALID_CREDENTIALS' }, { status: 401 }),
            ),
        );

        await captureError(apiClient.post('/login', {}, { baseURL: '/' }));

        expect(handler).not.toHaveBeenCalled();
    });
});
