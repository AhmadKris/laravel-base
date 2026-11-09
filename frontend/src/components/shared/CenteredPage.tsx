import type { ReactNode } from 'react';

interface CenteredPageProps {
    children: ReactNode;
}

export function CenteredPage({ children }: CenteredPageProps) {
    return <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">{children}</section>;
}
