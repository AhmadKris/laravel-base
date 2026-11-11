import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/hooks/usePermission';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { toApiError } from '@/lib/api-error';
import { BrandingSection } from '../components/BrandingSection';
import { LogoPreview } from '../components/LogoPreview';
import { OtherSettings, ReadOnlySection } from '../components/ReadOnlySettings';
import { SettingsSection } from '../components/SettingsSection';
import { arrangeSettings } from '../settingSections';
import { settingKeys, settingService } from '../services/settingService';

interface SettingsTab {
    id: string;
    label: string;
    isDirty: boolean;
    content: ReactNode;
}

export function SettingsPage() {
    const { can } = usePermission();
    const canUpdate = can('system_config.update');
    const [params, setParams] = useSearchParams();

    const query = useQuery({
        queryKey: settingKeys.all,
        queryFn: settingService.listAll,
        // A refetch with a newer version refills the form, which would discard unsaved edits.
        refetchOnWindowFocus: false,
    });

    // Each section keeps its own form, so their unsaved changes are collected here for one guard.
    const [dirtyParts, setDirtyParts] = useState<ReadonlySet<string>>(() => new Set());
    const markDirty = useCallback((part: string, dirty: boolean) => {
        setDirtyParts((current) => {
            if (current.has(part) === dirty) {
                return current;
            }

            const next = new Set(current);

            if (dirty) {
                next.add(part);
            } else {
                next.delete(part);
            }

            return next;
        });
    }, []);
    const guard = useUnsavedChangesGuard(dirtyParts.size > 0);

    const header = (
        <PageHeader
            title="Pengaturan sistem"
            description="Data perusahaan, lokalisasi, dan fitur aplikasi."
        />
    );

    if (query.isPending) {
        return (
            <CenteredPage width="wide">
                <PageSkeleton label="Memuat pengaturan" />
            </CenteredPage>
        );
    }

    if (query.isError) {
        return (
            <CenteredPage width="wide">
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
    const byId = new Map(sections.map((entry) => [entry.section.id, entry]));

    const tabs: SettingsTab[] = [];
    const companyEntry = byId.get('company');

    if (companyEntry !== undefined) {
        tabs.push({
            id: 'company',
            label: companyEntry.section.title,
            isDirty: dirtyParts.has('company'),
            content: renderSection(companyEntry),
        });
    }

    const logoDisplayEntry = byId.get('logo-display');

    if (hasBranding || logoDisplayEntry !== undefined) {
        const hasBrandingDirty =
            dirtyParts.has('logo-display') ||
            Array.from(dirtyParts).some((part) => part.startsWith('branding:'));

        tabs.push({
            id: 'branding',
            label: 'Branding',
            isDirty: hasBrandingDirty,
            content: (
                <div className="flex flex-col gap-4">
                    {hasBranding && (
                        <BrandingSection canUpdate={canUpdate} onDirtyChange={markDirty} />
                    )}
                    {logoDisplayEntry !== undefined && renderSection(logoDisplayEntry)}
                </div>
            ),
        });
    }

    for (const id of ['localization', 'feature']) {
        const entry = byId.get(id);

        if (entry !== undefined) {
            tabs.push({
                id: entry.section.id,
                label: entry.section.title,
                isDirty: dirtyParts.has(entry.section.id),
                content: renderSection(entry),
            });
        }
    }

    if (others.length > 0) {
        tabs.push({
            id: 'others',
            label: 'Konfigurasi lain',
            isDirty: false,
            content: <OtherSettings items={others} />,
        });
    }

    const requestedTab = params.get('tab');
    const activeTab = tabs.some((tab) => tab.id === requestedTab)
        ? (requestedTab as string)
        : (tabs[0]?.id ?? '');

    const changeTab = (nextTab: string) => {
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                next.set('tab', nextTab);

                return next;
            },
            { replace: true },
        );
    };

    return (
        <CenteredPage width="wide">
            {header}
            {tabs.length === 0 ? (
                <Card className="py-0">
                    <EmptyState
                        title="Belum ada pengaturan"
                        description="Tidak ada konfigurasi yang dapat Anda akses."
                    />
                </Card>
            ) : (
                <Tabs value={activeTab} onValueChange={changeTab}>
                    <TabsList variant="line" aria-label="Kategori pengaturan">
                        {tabs.map((tab) => {
                            const dirtyHintId = `${tab.id}-dirty-hint`;

                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    aria-describedby={tab.isDirty ? dirtyHintId : undefined}
                                >
                                    {tab.label}
                                    {tab.isDirty && (
                                        <span
                                            aria-hidden="true"
                                            className="size-1.5 rounded-full bg-primary"
                                        />
                                    )}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                    {tabs.some((tab) => tab.isDirty) && (
                        <div className="sr-only">
                            {tabs
                                .filter((tab) => tab.isDirty)
                                .map((tab) => (
                                    <span key={tab.id} id={`${tab.id}-dirty-hint`}>
                                        Ada perubahan belum disimpan pada bagian {tab.label}
                                    </span>
                                ))}
                        </div>
                    )}
                    {tabs.map((tab) => (
                        // Keep inactive tabs mounted so switching tabs preserves unsaved edits and dirty state.
                        <TabsContent key={tab.id} value={tab.id} forceMount>
                            {tab.content}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
            {guard.dialog}
        </CenteredPage>
    );

    function renderSection({ section, items }: (typeof sections)[number]) {
        return canUpdate ? (
            // A new version after a reload or save refills the form with the stored values.
            <SettingsSection
                key={`${section.id}:${items.map((item) => item.version).join(',')}`}
                section={section}
                items={items}
                onDirtyChange={(dirty) => markDirty(section.id, dirty)}
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
