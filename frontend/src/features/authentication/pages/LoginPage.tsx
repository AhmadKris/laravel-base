import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormField } from '@/components/shared/FormField';
import { PageHeader } from '@/components/shared/PageHeader';
import { PasswordField } from '@/components/shared/PasswordField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { applyFormError } from '@/lib/form-errors';
import { useAuthStore } from '@/stores/auth-store';
import { loginSchema, type LoginValues } from '../schemas';
import { authService } from '../services/authService';

const REMEMBER_FIELD_ID = 'login-remember';
const REMEMBER_HINT_ID = 'login-remember-hint';

export function LoginPage() {
    const setUser = useAuthStore((state) => state.setUser);
    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { identifier: '', password: '', remember: false },
    });

    // GuestRoute performs the redirect once the store holds the signed-in user.
    const login = useMutation({
        mutationFn: authService.login,
        onSuccess: (user) => setUser(user),
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <>
            <PageHeader
                title="Masuk"
                description="Gunakan email atau username dan password akun Anda."
            />
            <form
                noValidate
                className="grid gap-3"
                onSubmit={form.handleSubmit((values) => login.mutate(values))}
            >
                <FormAlert message={form.formState.errors.root?.server?.message} />
                <FormField
                    control={form.control}
                    name="identifier"
                    label="Email atau username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                />
                <PasswordField
                    control={form.control}
                    name="password"
                    label="Password"
                    autoComplete="current-password"
                />
                <div className="grid gap-1">
                    <div className="flex items-center justify-between gap-3">
                        <Controller
                            control={form.control}
                            name="remember"
                            render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={REMEMBER_FIELD_ID}
                                        ref={field.ref}
                                        checked={field.value}
                                        onBlur={field.onBlur}
                                        onCheckedChange={(checked) =>
                                            field.onChange(checked === true)
                                        }
                                        aria-describedby={REMEMBER_HINT_ID}
                                    />
                                    <Label htmlFor={REMEMBER_FIELD_ID}>Ingat saya</Label>
                                </div>
                            )}
                        />
                        <Link to="/forgot-password" className="text-sm underline">
                            Lupa password?
                        </Link>
                    </div>
                    <p id={REMEMBER_HINT_ID} className="text-xs text-muted-foreground">
                        Tetap masuk di perangkat ini selama 30 hari. Jangan dipakai di komputer
                        bersama.
                    </p>
                </div>
                <Button type="submit" disabled={login.isPending}>
                    Masuk ke aplikasi
                </Button>
            </form>
        </>
    );
}
