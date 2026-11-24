import { useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { authService } from '@/features/authentication/services/authService';
import { toApiError } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth-store';
import type { ConfirmEmailChangePayload } from '@/types/api-response';
import { accountService } from '../services/accountService';

function readConfirmationLink(fragment: string): ConfirmEmailChangePayload | null {
    const params = new URLSearchParams(fragment.slice(1));
    const id = params.get('id');
    const token = params.get('token');

    return id && token ? { id, token } : null;
}

function errorMessage(error: unknown): string {
    const apiError = toApiError(error);

    return apiError.fieldErrors.email?.[0] ?? apiError.message;
}

/**
 * Asks for a click instead of confirming on load, so opening the page twice or a link preview
 * cannot use up the link.
 */
export function ConfirmEmailPage() {
    const { hash } = useLocation();
    const link = readConfirmationLink(hash);
    const status = useAuthStore((state) => state.status);
    const setUser = useAuthStore((state) => state.setUser);
    const isSignedIn = status === 'authenticated';

    const confirm = useMutation({
        mutationFn: accountService.confirmEmailChange,
        onSuccess: async () => {
            if (isSignedIn) {
                setUser(await authService.getCurrentUser());
            }
        },
    });

    return (
        <>
            <PageHeader title="Konfirmasi email baru" />
            {link === null ? (
                <p role="alert" className="text-sm text-destructive">
                    Tautan konfirmasi tidak lengkap. Buka tautan dari email Anda.
                </p>
            ) : confirm.isSuccess ? (
                <div role="status" className="grid gap-3">
                    <p className="text-sm">
                        Email akun Anda telah diubah. Gunakan email baru untuk masuk mulai sekarang.
                    </p>
                    <Button asChild>
                        <Link to={isSignedIn ? '/account' : '/login'}>
                            {isSignedIn ? 'Buka Akun saya' : 'Masuk'}
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3">
                    <p className="text-sm text-muted-foreground">
                        Tekan tombol di bawah untuk menjadikan alamat ini email login akun Anda.
                    </p>
                    {confirm.isError && (
                        <p role="alert" className="text-sm text-destructive">
                            {errorMessage(confirm.error)}
                        </p>
                    )}
                    <Button loading={confirm.isPending} onClick={() => confirm.mutate(link)}>
                        Konfirmasi email
                    </Button>
                </div>
            )}
        </>
    );
}
