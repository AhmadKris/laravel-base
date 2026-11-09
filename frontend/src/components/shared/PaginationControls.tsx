import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types/api-response';

interface PaginationControlsProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
}

export function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
    const { current_page: page, last_page: lastPage, from, to, total } = pagination;

    return (
        <nav
            aria-label="Navigasi halaman"
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
            <p className="text-muted-foreground">
                {total === 0 ? 'Tidak ada data' : `Menampilkan ${from}–${to} dari ${total} data`}
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Sebelumnya
                </Button>
                <span aria-current="page">
                    Halaman {page} dari {Math.max(lastPage, 1)}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= lastPage}
                    onClick={() => onPageChange(page + 1)}
                >
                    Berikutnya
                </Button>
            </div>
        </nav>
    );
}
