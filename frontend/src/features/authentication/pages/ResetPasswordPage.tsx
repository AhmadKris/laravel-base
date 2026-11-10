import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { PageHeader } from '@/components/shared/PageHeader';
import { PasswordField } from '@/components/shared/PasswordField';
import { Button } from '@/components/ui/button';
import { applyFormError } from '@/lib/form-errors';
import { useAuthStore } from '@/stores/auth-store';
import { NEW_PASSWORD_HINT, resetPasswordSchema, type ResetPasswordValues } from '../schemas';
import { authService } from '../services/authService';

interface ResetLink {
    token: string;
    email: string;
}

function readResetLink(fragment: string): ResetLink | null {
    const params = new URLSearchParams(fragment.slice(1));
    const token = params.get('token');
    const email = params.get('email');

    return token && email ? { token, email } : null;
}

function ResetPasswordForm({ token, email }: ResetLink) {
    const setGuest = useAuthStore((state) => state.setGuest);
    const navigate = useNavigate();
    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: '', password_confirmation: '' },
    });

    const resetPassword = useMutation({
        mutationFn: authService.resetPassword,
        onSuccess: () => {
            // The backend has ended every session of this account.
            setGuest();
            toast.success('Password berhasil diganti. Silakan masuk dengan password baru.');
            void navigate('/login', { replace: true });
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <form
            noValidate
            className="grid gap-3"
            onSubmit={form.handleSubmit((values) =>
                resetPassword.mutate({ ...values, token, email }),
            )}
        >
            <p className="text-sm text-muted-foreground">Untuk akun {email}</p>
            <FormAlert message={form.formState.errors.root?.server?.message} />
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
            <Button type="submit" loading={resetPassword.isPending}>
                Simpan password baru
            </Button>
        </form>
    );
}

export function ResetPasswordPage() {
    const { hash } = useLocation();
    const resetLink = readResetLink(hash);

    return (
        <>
            <PageHeader title="Buat password baru" />
            {resetLink === null ? (
                <p role="alert" className="text-sm text-destructive">
                    Tautan reset password tidak lengkap. Buka tautan dari email Anda atau minta
                    tautan baru.
                </p>
            ) : (
                <ResetPasswordForm {...resetLink} />
            )}
            <Link to="/forgot-password" className="text-sm underline">
                Minta tautan baru
            </Link>
        </>
    );
}
