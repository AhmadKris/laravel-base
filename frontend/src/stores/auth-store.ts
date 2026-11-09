import { create } from 'zustand';
import type { AuthenticatedUser } from '@/types/api-response';

type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unavailable';

interface AuthState {
    status: AuthStatus;
    user: AuthenticatedUser | null;
    setLoading: () => void;
    setUser: (user: AuthenticatedUser) => void;
    setGuest: () => void;
    setUnavailable: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    status: 'loading',
    user: null,
    setLoading: () => set({ status: 'loading' }),
    setUser: (user) => set({ status: 'authenticated', user }),
    setGuest: () => set({ status: 'guest', user: null }),
    setUnavailable: () => set({ status: 'unavailable', user: null }),
}));
