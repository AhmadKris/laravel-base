import { CircleAlert } from 'lucide-react';

interface FormAlertProps {
    message: string | undefined;
}

export function FormAlert({ message }: FormAlertProps) {
    if (message === undefined) {
        return null;
    }

    return (
        <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p className="min-w-0 flex-1">{message}</p>
        </div>
    );
}
