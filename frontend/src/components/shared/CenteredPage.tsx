import type { ReactNode } from 'react';

const WIDTH_CLASSES = {
    default: 'max-w-2xl',
    wide: 'max-w-5xl',
} as const;

interface CenteredPageProps {
    width?: keyof typeof WIDTH_CLASSES;
    children: ReactNode;
}

export function CenteredPage({ width = 'default', children }: CenteredPageProps) {
    return (
        <section className={`mx-auto flex w-full ${WIDTH_CLASSES[width]} flex-col gap-4`}>
            {children}
        </section>
    );
}
