import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormField } from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { applyFormError } from '@/lib/form-errors';
import { useAuthStore } from '@/stores/auth-store';
import { loginSchema, type LoginValues } from '../schemas';
import { authService } from '../services/authService';

export function LoginPage() {
    const setUser = useAuthStore((state) => state.setUser);
    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    // GuestRoute performs the redirect once the store holds the signed-in user.
    const login = useMutation({
        mutationFn: authService.login,
        onSuccess: (user) => setUser(user),
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <>
            <h1 className="text-lg font-semibold">Masuk</h1>
            <form
                noValidate
                className="grid gap-3"
                onSubmit={form.handleSubmit((values) => login.mutate(values))}
            >
                <FormAlert message={form.formState.errors.root?.server?.message} />
                <FormField
                    control={form.control}
                    name="email"
                    label="Email"
                    type="email"
                    autoComplete="username"
                />
                <FormField
                    control={form.control}
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                />
                <Button type="submit" disabled={login.isPending}>
                    Masuk ke aplikasi
                </Button>
            </form>
            <Link to="/forgot-password" className="text-sm underline">
                Lupa password?
            </Link>
        </>
    );
}
