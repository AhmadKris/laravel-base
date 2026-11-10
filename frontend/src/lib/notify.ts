import { toast } from 'sonner';
import { toApiError } from './api-error';

// Errors stay longer than the default 4 seconds, so there is time to read what to do next.
const ERROR_DURATION_MS = 8000;

export function notifyError(error: unknown): void {
    const apiError = toApiError(error);
    // A server failure is not fixable by the user, so the code lets support find it in the logs.
    const description =
        apiError.status >= 500 && apiError.requestId !== undefined
            ? `Kode permintaan: ${apiError.requestId}`
            : undefined;

    toast.error(apiError.message, { description, duration: ERROR_DURATION_MS });
}
