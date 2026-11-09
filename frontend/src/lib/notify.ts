import { toast } from 'sonner';
import { toApiError } from './api-error';

export function notifyError(error: unknown): void {
    toast.error(toApiError(error).message);
}
