import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/**
 * Shown when a page throws while rendering, for example when a page file from an older release
 * can no longer be loaded. Inside the app layout the sidebar and header stay usable.
 */
export function RouteErrorPage() {
    return (
        <section
            role="alert"
            className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-4 p-4 text-center"
        >
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert aria-hidden="true" className="size-6" />
            </span>
            <div className="grid gap-1.5">
                <h1 className="text-xl font-semibold tracking-tight">
                    Halaman ini gagal ditampilkan
                </h1>
                <p className="text-sm text-muted-foreground">
                    Muat ulang halaman untuk mencoba lagi. Perubahan yang belum disimpan di halaman
                    ini tidak ikut tersimpan. Jika masalah berulang, hubungi administrator.
                </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" asChild>
                    <Link to="/" reloadDocument>
                        Ke beranda
                    </Link>
                </Button>
                <Button onClick={() => window.location.reload()}>Muat ulang halaman</Button>
            </div>
        </section>
    );
}
