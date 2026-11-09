import { create } from 'zustand';
import type { AuthenticatedUser } from '@/types/api-response';

// 'signed-out' is a deliberate logout, unlike 'guest', so the next login does not resume the old page.
type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'signed-out' | 'unavailable';

interface AuthState {
    status: AuthStatus;
    user: AuthenticatedUser | null;
    setLoading: () => void;
    setUser: (user: AuthenticatedUser) => void;
    setGuest: () => void;
    setSignedOut: () => void;
    setUnavailable: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    status: 'loading',
    user: null,
    setLoading: () => set({ status: 'loading' }),
    setUser: (user) => set({ status: 'authenticated', user }),
    setGuest: () => set({ status: 'guest', user: null }),
    setSignedOut: () => set({ status: 'signed-out', user: null }),
    setUnavailable: () => set({ status: 'unavailable', user: null }),
}));
