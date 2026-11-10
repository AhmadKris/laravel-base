import { cn } from 'cn';
import { useBranding } from '@/hooks/useBranding';
import { APP_NAME } from '@/lib/app-name';
import { useThemeStore } from '@/stores/theme-store';
import type { LogoDisplay } from '@/types/api-response';

const HEIGHT: Record<LogoDisplay['size'], string> = {
    small: 'h-6',
    medium: 'h-8',
    large: 'h-10',
};

// A logo shown without the name usually contains the name itself, so it gets more width.
const MAX_WIDTH: Record<LogoDisplay['size'], { withName: string; alone: string }> = {
    small: { withName: 'max-w-24', alone: 'max-w-36' },
    medium: { withName: 'max-w-32', alone: 'max-w-44' },
    large: { withName: 'max-w-40', alone: 'max-w-52' },
};

const BACKGROUND: Record<LogoDisplay['background'], string> = {
    transparent: '',
    white: 'rounded-md bg-white p-1',
    primary: 'rounded-md bg-primary p-1',
};

interface BrandMarkProps {
    logoUrl: string | undefined;
    display: LogoDisplay;
    /** Colors of the letter shown while no logo is uploaded. */
    markClassName: string;
    nameClassName?: string;
    logoClassName?: string;
}

/**
 * Renders the logo and the name as siblings, so the parent decides the layout and gap.
 */
export function BrandMark({
    logoUrl,
    display,
    markClassName,
    nameClassName,
    logoClassName,
}: BrandMarkProps) {
    const showName = logoUrl === undefined || display.show_name;
    const width = MAX_WIDTH[display.size];

    return (
        <>
            {logoUrl === undefined ? (
                <span
                    aria-hidden="true"
                    className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                        markClassName,
                    )}
                >
                    {APP_NAME.charAt(0)}
                </span>
            ) : (
                <span className={cn('flex shrink-0 items-center', BACKGROUND[display.background])}>
                    <img
                        src={logoUrl}
                        // Without the name beside it, the logo is the only thing naming the application.
                        alt={showName ? '' : APP_NAME}
                        className={cn(
                            'w-auto object-contain',
                            HEIGHT[display.size],
                            showName ? width.withName : width.alone,
                            logoClassName,
                        )}
                    />
                </span>
            )}
            {showName && (
                <span className={cn('truncate font-semibold', nameClassName)}>{APP_NAME}</span>
            )}
        </>
    );
}

interface AppBrandProps extends Omit<BrandMarkProps, 'logoUrl' | 'display'> {
    /** "dark" for a surface that is dark in both themes, such as the login panel. */
    surface?: 'theme' | 'dark';
}

export function AppBrand({ surface = 'theme', ...props }: AppBrandProps) {
    const { logoUrl, logoDarkUrl, display } = useBranding();
    const theme = useThemeStore((state) => state.resolved);
    const isDark = surface === 'dark' || theme === 'dark';

    return (
        <BrandMark
            logoUrl={isDark ? (logoDarkUrl ?? logoUrl) : logoUrl}
            display={display}
            {...props}
        />
    );
}
