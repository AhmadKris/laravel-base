import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
    return (
        <main className="mx-auto flex max-w-md flex-col items-start gap-3 p-6">
            <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
            <p className="text-sm text-muted-foreground">
                Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
            </p>
            <Button asChild variant="outline">
                <Link to="/">Kembali ke Beranda</Link>
            </Button>
        </main>
    );
}
