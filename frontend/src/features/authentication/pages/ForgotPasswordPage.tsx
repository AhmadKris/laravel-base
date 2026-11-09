import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormField } from '@/components/shared/FormField';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { applyFormError } from '@/lib/form-errors';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';
import { authService } from '../services/authService';

export function ForgotPasswordPage() {
    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    });

    const requestLink = useMutation({
        mutationFn: authService.forgotPassword,
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <>
            <PageHeader
                title="Lupa password"
                description="Masukkan email akun Anda untuk menerima tautan reset."
            />
            {requestLink.isSuccess ? (
                <p role="status" className="text-sm">
                    Jika email tersebut terdaftar, tautan reset password telah dikirim. Tautan
                    berlaku selama 60 menit.
                </p>
            ) : (
                <form
                    noValidate
                    className="grid gap-3"
                    onSubmit={form.handleSubmit((values) => requestLink.mutate(values))}
                >
                    <FormAlert message={form.formState.errors.root?.server?.message} />
                    <FormField
                        control={form.control}
                        name="email"
                        label="Email"
                        type="email"
                        autoComplete="username"
                    />
                    <Button type="submit" disabled={requestLink.isPending}>
                        Kirim tautan reset
                    </Button>
                </form>
            )}
            <Link to="/login" className="text-sm underline">
                Kembali ke halaman masuk
            </Link>
        </>
    );
}
