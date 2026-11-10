import type { ReactNode } from 'react';

interface FormSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
}

/**
 * Groups related fields inside a FormCard so longer forms stay scannable without extra cards.
 */
export function FormSection({ title, description, children }: FormSectionProps) {
    return (
        <section className="grid gap-4 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0">
            <div className="grid gap-0.5">
                <h2 className="text-sm font-semibold">{title}</h2>
                {description !== undefined && (
                    <p className="text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="grid gap-4">{children}</div>
        </section>
    );
}
