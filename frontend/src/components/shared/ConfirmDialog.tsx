import { CircleAlert, Loader2, TriangleAlert } from 'lucide-react';
import type { MouseEvent } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    confirmVariant?: 'destructive' | 'default';
    onConfirm: () => void;
    isPending?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    confirmVariant = 'destructive',
    onConfirm,
    isPending = false,
}: ConfirmDialogProps) {
    const isDestructive = confirmVariant === 'destructive';

    // The dialog stays open until the caller closes it, so a failed request can be retried.
    const handleConfirm = (event: MouseEvent) => {
        event.preventDefault();
        onConfirm();
    };

    // Closing while the request runs would hide whether it succeeded.
    const handleOpenChange = (next: boolean) => {
        if (!isPending) {
            onOpenChange(next);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia
                        className={
                            isDestructive
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-primary/10 text-primary'
                        }
                    >
                        {isDestructive ? (
                            <TriangleAlert aria-hidden="true" />
                        ) : (
                            <CircleAlert aria-hidden="true" />
                        )}
                    </AlertDialogMedia>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        variant={confirmVariant}
                        disabled={isPending}
                        aria-busy={isPending}
                        onClick={handleConfirm}
                    >
                        {isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
