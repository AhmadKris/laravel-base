import type { FormEventHandler, ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface FormCardProps {
    onSubmit: FormEventHandler<HTMLFormElement>;
    children: ReactNode;
    actions: ReactNode;
}

export function FormCard({ onSubmit, children, actions }: FormCardProps) {
    return (
        <Card className="gap-0 py-0">
            <form noValidate onSubmit={onSubmit}>
                <div className="grid gap-4 p-5">{children}</div>
                <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3">{actions}</div>
            </form>
        </Card>
    );
}
