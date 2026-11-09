import { useCallback } from 'react';
import { ApiError } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '../services/authService';

export function useLoadCurrentUser(): () => Promise<void> {
    return useCallback(async () => {
        const { setLoading, setUser, setGuest, setUnavailable } = useAuthStore.getState();

        setLoading();

        try {
            setUser(await authService.getCurrentUser());
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                setGuest();

                return;
            }

            setUnavailable();
        }
    }, []);
}
