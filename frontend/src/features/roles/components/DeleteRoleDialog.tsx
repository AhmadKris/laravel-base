import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { notifyError } from '@/lib/notify';
import type { Role } from '@/types/api-response';
import { roleKeys, roleService } from '../services/roleService';

interface DeleteRoleDialogProps {
    role: Role | null;
    onClose: () => void;
    onDeleted: () => void;
}

export function DeleteRoleDialog({ role, onClose, onDeleted }: DeleteRoleDialogProps) {
    const queryClient = useQueryClient();

    const remove = useMutation({
        mutationFn: (target: Role) => roleService.remove(target.id),
        onSuccess: (_result, target) => {
            queryClient.removeQueries({ queryKey: roleKeys.detail(String(target.id)) });
            void queryClient.invalidateQueries({ queryKey: roleKeys.lists });
            toast.success(`Role ${target.name} telah dihapus.`);
            onDeleted();
        },
        onError: notifyError,
    });

    return (
        <ConfirmDialog
            open={role !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            title={`Hapus role ${role?.name}?`}
            description={`Role ${role?.name} akan dihapus permanen. Role yang masih dipakai pengguna tidak dapat dihapus.`}
            confirmLabel="Hapus role"
            isPending={remove.isPending}
            onConfirm={() => {
                if (role !== null) {
                    remove.mutate(role);
                }
            }}
        />
    );
}
