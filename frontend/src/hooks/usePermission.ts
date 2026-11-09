import { useAuthStore } from '@/stores/auth-store';

interface PermissionChecks {
    can: (permission: string) => boolean;
    canAny: (permissions: string[]) => boolean;
    canAll: (permissions: string[]) => boolean;
}

/**
 * Only decides what the interface shows. The backend enforces every permission.
 */
export function usePermission(): PermissionChecks {
    const granted = useAuthStore((state) => state.user?.permissions);

    const can = (permission: string) => granted?.includes(permission) ?? false;

    return {
        can,
        canAny: (permissions) => permissions.some(can),
        canAll: (permissions) => permissions.every(can),
    };
}
