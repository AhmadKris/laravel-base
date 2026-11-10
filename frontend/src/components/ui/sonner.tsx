import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
    CircleCheckIcon,
    InfoIcon,
    TriangleAlertIcon,
    OctagonXIcon,
    Loader2Icon,
} from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';

const Toaster = ({ ...props }: ToasterProps) => {
    const theme = useThemeStore((state) => state.resolved);

    return (
        <Sonner
            theme={theme}
            className="toaster group"
            position="top-right"
            // Below the 3.5rem app header, so the user menu stays reachable.
            offset={{ top: '4.25rem', right: '1rem' }}
            mobileOffset={{ top: '4.25rem' }}
            closeButton
            containerAriaLabel="Notifikasi"
            // Each type keeps one icon, so the meaning does not rely on color alone.
            icons={{
                success: <CircleCheckIcon className="size-4 text-success" />,
                info: <InfoIcon className="size-4 text-info" />,
                warning: <TriangleAlertIcon className="size-4 text-warning" />,
                error: <OctagonXIcon className="size-4 text-destructive" />,
                loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--border-radius': 'var(--radius)',
                } as React.CSSProperties
            }
            toastOptions={{
                closeButtonAriaLabel: 'Tutup notifikasi',
                // Low contrast: a colored edge marks the type while the text stays on a neutral surface.
                // The "!" overrides the border width that Sonner sets on every toast.
                classNames: {
                    toast: 'cn-toast border-l-4!',
                    title: 'font-medium',
                    description: 'text-muted-foreground!',
                    success: 'border-l-success!',
                    info: 'border-l-info!',
                    warning: 'border-l-warning!',
                    error: 'border-l-destructive!',
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
