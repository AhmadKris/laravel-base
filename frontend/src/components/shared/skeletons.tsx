import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonProps {
    label: string;
}

interface TableSkeletonProps extends SkeletonProps {
    columns: number;
    rows?: number;
}

function repeat(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index);
}

export function TableSkeleton({ label, columns, rows = 5 }: TableSkeletonProps) {
    return (
        <div role="status" aria-label={label} className="flex flex-col">
            <div
                className="grid gap-4 border-b px-4 py-3"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
                {repeat(columns).map((column) => (
                    <Skeleton key={column} className="h-4 w-20" />
                ))}
            </div>
            {repeat(rows).map((row) => (
                <div
                    key={row}
                    data-testid="skeleton-row"
                    className="grid items-center gap-4 border-b px-4 py-3 last:border-b-0"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    {repeat(columns).map((column) => (
                        <Skeleton key={column} className="h-5 w-3/4" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function ListSkeleton({ label, rows = 5 }: SkeletonProps & { rows?: number }) {
    return (
        <div role="status" aria-label={label} className="flex flex-col gap-4">
            {repeat(rows).map((row) => (
                <div key={row} className="flex items-center gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function FormSkeleton({ label }: SkeletonProps) {
    return (
        <div role="status" aria-label={label} className="flex flex-col gap-4">
            <Skeleton className="h-8 w-40" />
            <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-full" />
        </div>
    );
}

export function PageSkeleton({ label }: SkeletonProps) {
    return (
        <div role="status" aria-label={label} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    );
}

export function AppShellSkeleton({ label }: SkeletonProps) {
    return (
        <div role="status" aria-label={label} className="flex min-h-svh">
            <div className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-sidebar p-3 md:flex">
                <Skeleton className="h-8 w-36" />
                {repeat(6).map((item) => (
                    <Skeleton key={item} className="h-9 w-full" />
                ))}
            </div>
            <div className="flex flex-1 flex-col">
                <div className="flex h-14 items-center justify-between border-b bg-card px-4">
                    <Skeleton className="size-7" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <div className="flex flex-col gap-5 p-4 md:p-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}
