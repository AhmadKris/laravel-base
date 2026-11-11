import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardService } from '../services/dashboardService';
import type { DashboardStat } from '../stats';

const numberFormat = new Intl.NumberFormat('id-ID');

export function StatTile({ label, path, href, filters }: DashboardStat) {
    const count = useQuery({
        queryKey: ['dashboard', 'count', path, filters],
        queryFn: () => dashboardService.countRecords(path, filters),
    });

    return (
        <Card className="relative gap-1.5 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/30 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
            <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                {label}
                <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
            </span>
            {!count.isError && (
                <Link
                    to={href}
                    aria-label={`Lihat ${label.toLowerCase()}`}
                    className="absolute inset-0 rounded-xl outline-none"
                />
            )}
            {count.isPending && (
                <Skeleton role="status" aria-label={`Memuat ${label}`} className="h-9 w-20" />
            )}
            {count.isError && (
                <div className="relative z-10 flex items-center gap-2">
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
