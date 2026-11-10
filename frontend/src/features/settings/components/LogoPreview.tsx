import { BrandMark } from '@/components/shared/AppBrand';
import { DEFAULT_LOGO_DISPLAY, useBranding } from '@/hooks/useBranding';
import type { LogoDisplay } from '@/types/api-response';
import { fieldName } from '../settingSections';
import type { SectionValues } from './SettingsSection';

function pick<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
    return options.find((option) => option === value) ?? fallback;
}

function toDisplay(values: Partial<SectionValues>): LogoDisplay {
    const showName = values[fieldName('company.logo_show_name')];

    return {
        show_name: typeof showName === 'boolean' ? showName : DEFAULT_LOGO_DISPLAY.show_name,
        background: pick(
            values[fieldName('company.logo_background')],
            ['transparent', 'white', 'primary'],
            DEFAULT_LOGO_DISPLAY.background,
        ),
        size: pick(
            values[fieldName('company.logo_size')],
            ['small', 'medium', 'large'],
            DEFAULT_LOGO_DISPLAY.size,
        ),
    };
}

interface LogoPreviewProps {
    values: Partial<SectionValues>;
}

export function LogoPreview({ values }: LogoPreviewProps) {
    const { logoUrl, logoDarkUrl } = useBranding();
    const display = toDisplay(values);

    return (
        <div className="grid gap-1.5">
            <p className="text-sm font-medium">Pratinjau</p>
            {logoUrl === undefined && (
                <p className="text-xs text-muted-foreground">
                    Pengaturan ini berlaku setelah logo diunggah.
                </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
                <figure className="grid gap-1">
                    {/* Fixed colors, so both panels look the same in light and dark mode. */}
                    <div className="flex h-16 min-w-0 items-center gap-2.5 rounded-lg border bg-white px-3 text-sm text-neutral-900">
                        <BrandMark
                            logoUrl={logoUrl}
                            display={display}
                            markClassName="bg-primary text-primary-foreground"
                        />
                    </div>
                    <figcaption className="text-xs text-muted-foreground">Latar terang</figcaption>
                </figure>
                <figure className="grid gap-1">
                    <div className="flex h-16 min-w-0 items-center gap-2.5 rounded-lg bg-brand px-3 text-sm text-brand-foreground">
                        <BrandMark
                            logoUrl={logoDarkUrl ?? logoUrl}
                            display={display}
                            markClassName="bg-brand-foreground text-brand"
                        />
                    </div>
                    <figcaption className="text-xs text-muted-foreground">
                        Latar gelap dan halaman masuk
                    </figcaption>
                </figure>
            </div>
        </div>
    );
}
