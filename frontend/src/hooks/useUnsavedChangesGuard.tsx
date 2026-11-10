import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface UnsavedChangesGuard {
    /** Lets the next navigation through, for the redirect that follows a successful save. */
    allowNavigation: () => void;
    dialog: ReactNode;
}

/**
 * Asks before leaving a page whose form has unsaved changes, both for links inside the app and
 * for closing or reloading the tab. Changing only the query string, such as a filter, is allowed.
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
    const allowed = useRef(false);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && !allowed.current && currentLocation.pathname !== nextLocation.pathname,
    );

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        // The browser shows its own message; the text of the event is ignored.
        const warn = (event: BeforeUnloadEvent) => event.preventDefault();

        window.addEventListener('beforeunload', warn);

        return () => window.removeEventListener('beforeunload', warn);
    }, [isDirty]);

    const allowNavigation = useCallback(() => {
        allowed.current = true;
    }, []);

    return {
        allowNavigation,
        dialog: (
            <ConfirmDialog
                open={blocker.state === 'blocked'}
                onOpenChange={(open) => {
                    if (!open && blocker.state === 'blocked') {
                        blocker.reset();
                    }
                }}
                title="Tinggalkan halaman ini?"
                description="Perubahan yang belum disimpan akan hilang."
                confirmLabel="Tinggalkan halaman"
                onConfirm={() => blocker.proceed?.()}
            />
        ),
    };
}
