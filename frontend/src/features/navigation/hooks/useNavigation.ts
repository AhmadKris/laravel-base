import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { navigationKeys, navigationService } from '../services/navigationService';

/** The menu of the signed-in user and the modules that are enabled. */
export function useNavigation() {
    const userId = useAuthStore((state) => state.user?.id);

    return useQuery({
        queryKey: navigationKeys.menu(userId ?? ''),
        queryFn: navigationService.menu,
        enabled: userId !== undefined,
    });
}

/**
 * Whether a module is enabled. While the answer is loading the module counts as enabled, so its
 * controls do not flicker away; the backend still refuses a disabled module.
 */
export function useModuleEnabled(module: string): boolean {
    const navigation = useNavigation();

    return navigation.data === undefined || navigation.data.modules.includes(module);
}
