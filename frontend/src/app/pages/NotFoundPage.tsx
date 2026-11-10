import { Link, useLocation, useNavigate } from 'react-router';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AppBrand } from '@/components/shared/AppBrand';
import { AppShellSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

interface NotFoundContentProps {
    homePath: string;
    homeLabel: string;
}

function NotFoundContent({ homePath, homeLabel }: NotFoundContentProps) {
    const { pathname, key } = useLocation();
    const navigate = useNavigate();
    const hasPreviousPage = key !== 'default';

    return (
        <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-7xl font-semibold tracking-tight text-primary tabular-nums">
                404
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
            <p className="max-w-md text-sm text-muted-foreground">
                Alamat <code className="font-mono break-all text-foreground">{pathname}</code> tidak
                tersedia atau sudah dipindahkan.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button asChild>
                    <Link to={homePath}>{homeLabel}</Link>
                </Button>
                {hasPreviousPage && (
                    <Button variant="outline" onClick={() => void navigate(-1)}>
                        Halaman sebelumnya
                    </Button>
                )}
            </div>
        </div>
    );
}

export function NotFoundPage() {
    const status = useAuthStore((state) => state.status);

    if (status === 'loading') {
        return <AppShellSkeleton label="Memeriksa sesi" />;
    }

    if (status === 'authenticated') {
        return (
            <AppLayout>
                <div className="flex min-h-[60svh] items-center justify-center">
                    <NotFoundContent homePath="/" homeLabel="Kembali ke Beranda" />
                </div>
            </AppLayout>
        );
    }

    return (
        <main
            id="main-content"
            tabIndex={-1}
            className="flex min-h-svh flex-col items-center justify-center gap-8 p-4 outline-none"
        >
            <div className="flex items-center gap-2.5">
                <AppBrand markClassName="bg-primary text-primary-foreground" />
            </div>
            <NotFoundContent homePath="/login" homeLabel="Ke halaman masuk" />
        </main>
    );
}
