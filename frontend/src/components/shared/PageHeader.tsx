import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    descriptionAction?: ReactNode;
    leading?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({
    title,
    description,
    descriptionAction,
    leading,
    actions,
}: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                {leading !== undefined && <div className="shrink-0">{leading}</div>}
                <div className="grid min-w-0 gap-0.5">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    {description !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <p className="min-w-0 text-sm break-words text-muted-foreground">
                                {description}
                            </p>
                            {descriptionAction}
                        </div>
                    )}
                </div>
            </div>
            {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
