import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

interface BackLinkProps {
    to: string;
    label: string;
}

export function BackLink({ to, label }: BackLinkProps) {
    return (
        <Button asChild variant="ghost" size="sm" className="self-start">
            <Link to={to}>
                <ArrowLeft aria-hidden="true" />
                {label}
            </Link>
        </Button>
    );
}
