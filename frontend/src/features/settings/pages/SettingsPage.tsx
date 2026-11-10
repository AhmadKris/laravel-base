import { useQuery } from '@tanstack/react-query';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Card } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { toApiError } from '@/lib/api-error';
import { BrandingSection } from '../components/BrandingSection';
import { LogoPreview } from '../components/LogoPreview';
import { OtherSettings, ReadOnlySection } from '../components/ReadOnlySettings';
import { SettingsSection } from '../components/SettingsSection';
import { arrangeSettings } from '../settingSections';
import { settingKeys, settingService } from '../services/settingService';

export function SettingsPage() {
    const { can } = usePermission();
    const canUpdate = can('system_config.update');

    const query = useQuery({
        queryKey: settingKeys.all,
        queryFn: settingService.listAll,
        // A refetch with a newer version refills the form, which would discard unsaved edits.
        refetchOnWindowFocus: false,
    });

    const header = (
        <PageHeader
            title="Pengaturan sistem"
            description="Data perusahaan, lokalisasi, dan fitur aplikasi."
        />
    );

    if (query.isPending) {
        return (
            <CenteredPage>
                <PageSkeleton label="Memuat pengaturan" />
            </CenteredPage>
        );
    }

    if (query.isError) {
        return (
            <CenteredPage>
                {header}
                <Card className="py-0">
                    <ErrorState
                        title="Pengaturan tidak dapat dimuat"
                        message={toApiError(query.error).message}
                        onRetry={() => void query.refetch()}
                    />
                </Card>
            </CenteredPage>
        );
    }

    const { sections, others, hasBranding } = arrangeSettings(query.data);
    // Logo and favicon belong to the company data, so they follow its section.
    const brandingIndex = sections[0]?.section.id === 'company' ? 1 : 0;
    const branding = hasBranding ? <BrandingSection canUpdate={canUpdate} /> : null;

    return (
        <CenteredPage>
            {header}
            {sections.length === 0 && others.length === 0 && !hasBranding && (
                <Card className="py-0">
                    <EmptyState
                        title="Belum ada pengaturan"
                        description="Tidak ada konfigurasi yang dapat Anda akses."
                    />
                </Card>
            )}
            {sections.slice(0, brandingIndex).map(renderSection)}
            {branding}
            {sections.slice(brandingIndex).map(renderSection)}
            {others.length > 0 && <OtherSettings items={others} />}
        </CenteredPage>
    );

    function renderSection({ section, items }: (typeof sections)[number]) {
        return canUpdate ? (
            // A new version after a reload or save refills the form with the stored values.
            <SettingsSection
                key={`${section.id}:${items.map((item) => item.version).join(',')}`}
                section={section}
                items={items}
                preview={
                    section.id === 'logo-display'
                        ? (values) => <LogoPreview values={values} />
                        : undefined
                }
            />
        ) : (
            <ReadOnlySection key={section.id} section={section} items={items} />
        );
    }
}
