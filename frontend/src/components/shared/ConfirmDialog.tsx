import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react';
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
import { FormAlert } from './FormAlert';

export type ConfirmVariant = 'destructive' | 'warning' | 'default';

const VARIANT_STYLES: Record<
    ConfirmVariant,
    {
        mediaClassName: string;
        buttonVariant: 'destructive-solid' | 'warning-solid' | 'default';
        Icon: typeof TriangleAlert;
    }
> = {
    destructive: {
        mediaClassName: 'bg-destructive/15 text-destructive',
        buttonVariant: 'destructive-solid',
        Icon: TriangleAlert,
    },
    warning: {
        mediaClassName: 'bg-warning/15 text-warning',
        buttonVariant: 'warning-solid',
        Icon: TriangleAlert,
    },
    default: {
        mediaClassName: 'bg-primary/15 text-primary',
        buttonVariant: 'default',
        Icon: CircleCheck,
    },
};

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    confirmVariant?: ConfirmVariant;
    error?: string;
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
    error,
    onConfirm,
    isPending = false,
}: ConfirmDialogProps) {
    const { mediaClassName, buttonVariant, Icon } = VARIANT_STYLES[confirmVariant];

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
                    <AlertDialogMedia className={mediaClassName}>
                        <Icon aria-hidden="true" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <FormAlert message={error} />
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        variant={buttonVariant}
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
