import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-error';

/**
 * Shows server validation errors on their form fields. Returns false when the error has none.
 */
export function applyFieldErrors<TValues extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<TValues>,
): boolean {
    if (!(error instanceof ApiError) || error.status !== 422) {
        return false;
    }

    const entries = Object.entries(error.fieldErrors);

    entries.forEach(([field, [message]], index) => {
        setError(
            field as FieldPath<TValues>,
            { type: 'server', message },
            { shouldFocus: index === 0 },
        );
    });

    return entries.length > 0;
}
