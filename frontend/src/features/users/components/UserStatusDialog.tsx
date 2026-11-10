import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toApiErrorMessage } from '@/lib/api-error';
import type { User } from '@/types/api-response';
import { userKeys, userService } from '../services/userService';

interface UserStatusDialogProps {
    user: User | null;
    onClose: () => void;
}

export function UserStatusDialog({ user, onClose }: UserStatusDialogProps) {
    const queryClient = useQueryClient();
    const isDeactivating = user?.status === 'active';

    const changeStatus = useMutation({
        mutationFn: async (target: User) => {
            if (target.status === 'active') {
                await userService.deactivate(target.id);
            } else {
                await userService.update(target.id, { status: 'active' });
            }
        },
        onSuccess: (_result, target) => {
            void queryClient.invalidateQueries({ queryKey: userKeys.all });
            toast.success(
                target.status === 'active'
                    ? `Pengguna ${target.name} telah dinonaktifkan.`
                    : `Pengguna ${target.name} telah diaktifkan kembali.`,
            );
            changeStatus.reset();
            onClose();
        },
    });

    return (
        <ConfirmDialog
            open={user !== null}
            onOpenChange={(open) => {
                if (!open) {
                    changeStatus.reset();
                    onClose();
                }
            }}
            title={
                isDeactivating
                    ? `Nonaktifkan pengguna ${user?.name}?`
                    : `Aktifkan kembali pengguna ${user?.name}?`
            }
            description={
                isDeactivating
                    ? `${user?.name} (${user?.email}) tidak dapat masuk lagi, dan semua sesinya akan diakhiri.`
                    : `${user?.name} (${user?.email}) dapat masuk kembali dengan passwordnya.`
            }
            confirmLabel={isDeactivating ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'}
            confirmVariant={isDeactivating ? 'destructive' : 'default'}
            error={changeStatus.error ? toApiErrorMessage(changeStatus.error) : undefined}
            isPending={changeStatus.isPending}
            onConfirm={() => {
                if (user !== null) {
                    changeStatus.mutate(user);
                }
            }}
        />
    );
}
