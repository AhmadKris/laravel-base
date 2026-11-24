import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { PasswordField } from '@/components/shared/PasswordField';
import { Button } from '@/components/ui/button';
import { applyFormError } from '@/lib/form-errors';
import { changePasswordSchema, type ChangePasswordValues, NEW_PASSWORD_HINT } from '../schemas';
import { authService } from '../services/authService';

interface ChangePasswordFormProps {
    onDirtyChange: (dirty: boolean) => void;
    onChanged: () => void;
}

export function ChangePasswordForm({ onDirtyChange, onChanged }: ChangePasswordFormProps) {
    const form = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { current_password: '', password: '', password_confirmation: '' },
    });
    const { isDirty } = form.formState;

    useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

    const changePassword = useMutation({
        mutationFn: authService.changePassword,
        onSuccess: () => {
            form.reset();
            onChanged();
            toast.success('Password berhasil diubah. Sesi di perangkat lain telah diakhiri.');
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <FormCard
            isDirty={isDirty}
            onSubmit={form.handleSubmit((values) => changePassword.mutate(values))}
            actions={
                <Button type="submit" disabled={!isDirty} loading={changePassword.isPending}>
                    Simpan password
                </Button>
            }
        >
            <div className="grid gap-0.5">
                <h2 className="text-sm font-semibold">Ubah password</h2>
                <p className="text-xs text-muted-foreground">
                    Setelah diganti, sesi di perangkat lain akan diakhiri.
                </p>
            </div>
            <FormAlert message={form.formState.errors.root?.server?.message} />
            <PasswordField
                control={form.control}
                name="current_password"
                label="Password saat ini"
                autoComplete="current-password"
                required
            />
            <PasswordField
                control={form.control}
                name="password"
                label="Password baru"
                autoComplete="new-password"
                required
                showLengthHint
                description={NEW_PASSWORD_HINT}
            />
            <PasswordField
                control={form.control}
                name="password_confirmation"
                label="Ulangi password baru"
                autoComplete="new-password"
                required
            />
        </FormCard>
    );
}
