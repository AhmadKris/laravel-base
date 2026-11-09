import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserAvatarProps {
    name: string;
    size?: 'sm' | 'default' | 'lg';
}

function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
}

export function UserAvatar({ name, size }: UserAvatarProps) {
    return (
        <Avatar size={size} aria-hidden="true">
            <AvatarFallback className="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                {initialsOf(name)}
            </AvatarFallback>
        </Avatar>
    );
}
