import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
    label: string;
    rows?: number;
}

export function LoadingState({ label, rows = 3 }: LoadingStateProps) {
    return (
        <div role="status" aria-label={label} className="flex flex-col gap-2 p-4">
            {Array.from({ length: rows }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
            ))}
        </div>
    );
}
