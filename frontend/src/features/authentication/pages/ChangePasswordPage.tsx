import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormField } from '@/components/shared/FormField';
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
        <div className="flex max-w-sm flex-col gap-4">
            <h1 className="text-lg font-semibold">Ubah password</h1>
            <form
                noValidate
                className="grid gap-3"
                onSubmit={form.handleSubmit((values) => changePassword.mutate(values))}
            >
                <FormAlert message={form.formState.errors.root?.server?.message} />
                <FormField
                    control={form.control}
                    name="current_password"
                    label="Password saat ini"
                    type="password"
                    autoComplete="current-password"
                />
                <FormField
                    control={form.control}
                    name="password"
                    label="Password baru"
                    type="password"
                    autoComplete="new-password"
                    description={NEW_PASSWORD_HINT}
                />
                <FormField
                    control={form.control}
                    name="password_confirmation"
                    label="Ulangi password baru"
                    type="password"
                    autoComplete="new-password"
                />
                <Button type="submit" disabled={changePassword.isPending}>
                    Simpan password
                </Button>
            </form>
        </div>
    );
}
