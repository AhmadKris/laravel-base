import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
    name: string;
    /** The photo URL; the initials show while it loads, when it fails, or without one. */
    src?: string;
    size?: 'sm' | 'default' | 'lg';
    className?: string;
}

function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
}

export function UserAvatar({ name, src, size, className }: UserAvatarProps) {
    return (
        <Avatar size={size} aria-hidden="true" className={className}>
            {src !== undefined && <AvatarImage src={src} alt="" />}
            <AvatarFallback className="bg-sidebar-accent font-medium text-sidebar-accent-foreground">
                {initialsOf(name)}
            </AvatarFallback>
        </Avatar>
    );
}
