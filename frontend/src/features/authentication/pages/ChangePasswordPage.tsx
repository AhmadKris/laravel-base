import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { PageHeader } from '@/components/shared/PageHeader';
import { PasswordField } from '@/components/shared/PasswordField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
        <div className="flex max-w-md flex-col gap-5">
            <PageHeader
                title="Ubah password"
                description="Setelah diganti, sesi di perangkat lain akan diakhiri."
            />
            <Card className="py-0">
                <form
                    noValidate
                    className="grid gap-3 p-5"
                    onSubmit={form.handleSubmit((values) => changePassword.mutate(values))}
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
                    <Button type="submit" disabled={changePassword.isPending}>
                        Simpan password
                    </Button>
                </form>
            </Card>
        </div>
    );
}
