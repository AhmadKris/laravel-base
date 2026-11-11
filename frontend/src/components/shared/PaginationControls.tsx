import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PaginationMeta } from '@/types/api-response';
import { PER_PAGE_OPTIONS } from './dataTableColumns';

interface PaginationControlsProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
}

export function PaginationControls({
    pagination,
    onPageChange,
    onPerPageChange,
}: PaginationControlsProps) {
    const {
        current_page: page,
        last_page: lastPage,
        per_page: perPage,
        from,
        to,
        total,
    } = pagination;

    return (
        <nav
            aria-label="Navigasi halaman"
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
            <div className="flex flex-wrap items-center gap-3">
                <p aria-live="polite" className="text-muted-foreground">
                    {total === 0
                        ? 'Tidak ada data'
                        : `Menampilkan ${from} sampai ${to} dari ${total} data`}
                </p>
                {onPerPageChange !== undefined && (
                    <Select
                        value={String(perPage)}
                        onValueChange={(value) => onPerPageChange(Number(value))}
                    >
                        <SelectTrigger size="sm" aria-label="Jumlah data per halaman">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PER_PAGE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option} per halaman
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
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
