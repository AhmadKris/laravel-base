import {
    Circle,
    House,
    type LucideIcon,
    ScrollText,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';

/**
 * Icons a module may name in its module.php. A module that needs another icon adds it here.
 */
const NAVIGATION_ICONS: Record<string, LucideIcon> = {
    house: House,
    users: Users,
    'shield-check': ShieldCheck,
    'scroll-text': ScrollText,
    settings: Settings,
};

export function NavigationIcon({ name, className }: { name: string; className?: string }) {
    const Icon = NAVIGATION_ICONS[name] ?? Circle;

    return <Icon aria-hidden="true" className={className} />;
}
