import { Button } from '@/components/ui/button';

interface ErrorStateProps {
    title: string;
    message: string;
    onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
    return (
        <div role="alert" className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            {onRetry !== undefined && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    Coba lagi
                </Button>
            )}
        </div>
    );
}
