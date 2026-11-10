import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import type { ConfigurationValue, SystemConfiguration } from '@/types/api-response';
import { displayValue, type SettingSection } from '../settingSections';

// Same padding and heading as the editable sections, so read-only and editable cards line up.
function SectionCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card className="gap-4 px-5 py-5">
            <h2 className="text-sm font-semibold">{title}</h2>
            {children}
        </Card>
    );
}

interface ReadOnlySectionProps {
    section: SettingSection;
    items: SystemConfiguration[];
}

export function ReadOnlySection({ section, items }: ReadOnlySectionProps) {
    return (
        <SectionCard title={section.title}>
            <dl className="grid gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
                {section.fields.map((field, index) => (
                    <div key={field.key} className="contents">
                        <dt className="text-muted-foreground">{field.label}</dt>
                        <dd className="break-words">{displayValue(field, items[index].value)}</dd>
                    </div>
                ))}
            </dl>
        </SectionCard>
    );
}

function rawValue(value: ConfigurationValue): string {
    if (value === null || value === '') {
        return '-';
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
}

interface OtherSettingsProps {
    items: SystemConfiguration[];
}

export function OtherSettings({ items }: OtherSettingsProps) {
    return (
        <SectionCard title="Konfigurasi lain">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {items.map((item) => (
                    <div key={item.key} className="grid gap-0.5">
                        <dt className="font-mono text-xs text-muted-foreground">{item.key}</dt>
                        <dd className="break-words">
                            {item.is_sensitive ? (
                                <span className="text-muted-foreground">
                                    Nilai rahasia, tidak ditampilkan
                                </span>
                            ) : (
                                rawValue(item.value)
                            )}
                        </dd>
                        {item.description !== null && (
                            <dd className="text-xs text-muted-foreground">{item.description}</dd>
                        )}
                    </div>
                ))}
            </dl>
        </SectionCard>
    );
}
