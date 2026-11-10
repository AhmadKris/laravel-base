import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toApiErrorMessage } from '@/lib/api-error';
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
            remove.reset();
            onDeleted();
        },
    });

    return (
        <ConfirmDialog
            open={role !== null}
            onOpenChange={(open) => {
                if (!open) {
                    remove.reset();
                    onClose();
                }
            }}
            title={`Hapus role ${role?.name}?`}
            description={`Role ${role?.name} akan dihapus permanen. Role yang masih dipakai pengguna tidak dapat dihapus.`}
            confirmLabel="Hapus role"
            error={remove.error ? toApiErrorMessage(remove.error) : undefined}
            isPending={remove.isPending}
            onConfirm={() => {
                if (role !== null) {
                    remove.mutate(role);
                }
            }}
        />
    );
}
