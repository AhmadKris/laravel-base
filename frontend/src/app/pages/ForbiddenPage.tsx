import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function ForbiddenPage() {
    return (
        <section className="mx-auto flex max-w-md flex-col items-start gap-3 p-6">
            <h1 className="text-xl font-semibold">Akses ditolak</h1>
            <p className="text-sm text-muted-foreground">
                Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator jika
                Anda memerlukan akses.
            </p>
            <Button asChild variant="outline">
                <Link to="/">Kembali ke Beranda</Link>
            </Button>
        </section>
    );
}
