import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface DetailCardProps {
    title: string;
    children: ReactNode;
}

/**
 * Wraps read-only detail sections with the standard heading and padding scale.
 */
export function DetailCard({ title, children }: DetailCardProps) {
    return (
        <Card className="gap-4 p-5">
            <h2 className="text-sm font-semibold">{title}</h2>
            {children}
        </Card>
    );
}
