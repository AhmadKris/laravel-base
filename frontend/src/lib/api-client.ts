import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toApiError } from './api-error';

const SAFE_METHODS = ['get', 'head', 'options'];

export const API_ROOT = '/';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    csrfRetried?: boolean;
}

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
    withCredentials: true,
    withXSRFToken: true,
    headers: { Accept: 'application/json' },
});

let onUnauthenticated: () => void = () => undefined;

export function setUnauthenticatedHandler(handler: () => void): void {
    onUnauthenticated = handler;
}

function hasCsrfCookie(): boolean {
    return document.cookie.split('; ').some((cookie) => cookie.startsWith('XSRF-TOKEN='));
}

async function refreshCsrfCookie(): Promise<void> {
    await apiClient.get('/sanctum/csrf-cookie', { baseURL: API_ROOT });
}

apiClient.interceptors.request.use(async (config) => {
    const isSafe = SAFE_METHODS.includes((config.method ?? 'get').toLowerCase());

    if (!isSafe && !hasCsrfCookie()) {
        await refreshCsrfCookie();
    }

    return config;
});

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetriableRequestConfig | undefined;

    if (error.response?.status === 419 && config !== undefined && !config.csrfRetried) {
        config.csrfRetried = true;
        await refreshCsrfCookie();

        return apiClient(config);
    }

    const apiError = toApiError(error);

    if (apiError.code === 'AUTH_UNAUTHENTICATED') {
        onUnauthenticated();
    }

    throw apiError;
});
