import type { FormEventHandler, ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface FormCardProps {
    onSubmit: FormEventHandler<HTMLFormElement>;
    children: ReactNode;
    actions: ReactNode;
    isDirty?: boolean;
}

export function FormCard({ onSubmit, children, actions, isDirty }: FormCardProps) {
    return (
        <Card className="gap-0 py-0">
            <form noValidate onSubmit={onSubmit}>
                <div className="grid gap-4 p-5">{children}</div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
                    {isDirty ? (
                        <p className="text-xs text-muted-foreground">
                            Ada perubahan belum disimpan
                        </p>
                    ) : (
                        <span aria-hidden="true" />
                    )}
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {actions}
                    </div>
                </div>
            </form>
        </Card>
    );
}
