import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import type { Account } from '@/types/api-response';
import { accountKeys } from '../services/accountService';

/**
 * Stores a saved account and copies the fields the header and menu show into the signed-in user.
 */
export function useSyncAuthUser(): (account: Account) => void {
    const queryClient = useQueryClient();
    const setUser = useAuthStore((state) => state.setUser);

    return (account) => {
        queryClient.setQueryData(accountKeys.account, account);

        const user = useAuthStore.getState().user;

        if (user !== null) {
            setUser({ ...user, name: account.name, email: account.email, avatar: account.avatar });
        }
    };
}
