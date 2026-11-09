import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
    status: 'active' | 'inactive';
}

export function StatusBadge({ status }: StatusBadgeProps) {
    return status === 'active' ? (
        <Badge variant="success">Aktif</Badge>
    ) : (
        <Badge variant="secondary">Nonaktif</Badge>
    );
}
