import { cn } from 'cn';
import { APP_NAME } from '@/lib/app-name';

interface AppLogoProps {
    className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                className,
            )}
        >
            {APP_NAME.charAt(0)}
        </span>
    );
}
