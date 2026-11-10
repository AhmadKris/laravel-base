import { toast } from 'sonner';
import { toApiError } from './api-error';

// Errors stay longer than the default 4 seconds, so there is time to read what to do next.
const ERROR_DURATION_MS = 8000;

export function notifyError(error: unknown): void {
    toast.error(toApiError(error).message, { duration: ERROR_DURATION_MS });
}
