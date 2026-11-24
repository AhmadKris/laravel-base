import { Circle } from 'lucide-react';
import { findNavigationIcon } from './navigationIconSet';

export function NavigationIcon({ name, className }: { name: string; className?: string }) {
    const Icon = findNavigationIcon(name)?.icon ?? Circle;

    return <Icon aria-hidden="true" className={className} />;
}
