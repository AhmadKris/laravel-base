import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardService } from '../services/dashboardService';
import type { DashboardStat } from '../stats';

const numberFormat = new Intl.NumberFormat('id-ID');

export function StatTile({ label, path, filters }: DashboardStat) {
    const count = useQuery({
        queryKey: ['dashboard', 'count', path, filters],
        queryFn: () => dashboardService.countRecords(path, filters),
    });

    return (
        <Card className="gap-1.5 px-4 py-4">
            <span className="text-sm text-muted-foreground">{label}</span>
            {count.isPending && (
                <Skeleton role="status" aria-label={`Memuat ${label}`} className="h-9 w-20" />
            )}
            {count.isError && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Gagal dimuat</span>
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        aria-label={`Muat ulang ${label}`}
                        onClick={() => void count.refetch()}
                    >
                        Muat ulang
                    </Button>
                </div>
            )}
            {count.isSuccess && (
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                    {numberFormat.format(count.data)}
                </span>
            )}
        </Card>
    );
}
