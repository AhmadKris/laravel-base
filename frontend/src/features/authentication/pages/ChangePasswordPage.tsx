import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { PasswordField } from '@/components/shared/PasswordField';
import { Button } from '@/components/ui/button';
import { applyFormError } from '@/lib/form-errors';
import { changePasswordSchema, type ChangePasswordValues, NEW_PASSWORD_HINT } from '../schemas';
import { authService } from '../services/authService';

export function ChangePasswordPage() {
    const form = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { current_password: '', password: '', password_confirmation: '' },
    });

    const changePassword = useMutation({
        mutationFn: authService.changePassword,
        onSuccess: () => {
            form.reset();
            toast.success('Password berhasil diubah. Sesi di perangkat lain telah diakhiri.');
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <CenteredPage>
            <PageHeader
                title="Ubah password"
                description="Setelah diganti, sesi di perangkat lain akan diakhiri."
            />
            <FormCard
                onSubmit={form.handleSubmit((values) => changePassword.mutate(values))}
                actions={
                    <Button type="submit" disabled={changePassword.isPending}>
                        Simpan password
                    </Button>
                }
            >
                <FormAlert message={form.formState.errors.root?.server?.message} />
                <PasswordField
                    control={form.control}
                    name="current_password"
                    label="Password saat ini"
                    autoComplete="current-password"
                />
                <PasswordField
                    control={form.control}
                    name="password"
                    label="Password baru"
                    autoComplete="new-password"
                    description={NEW_PASSWORD_HINT}
                />
                <PasswordField
                    control={form.control}
                    name="password_confirmation"
                    label="Ulangi password baru"
                    autoComplete="new-password"
                />
            </FormCard>
        </CenteredPage>
    );
}
