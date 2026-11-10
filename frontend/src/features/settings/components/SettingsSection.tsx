import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { FormField } from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type ApiError, toApiError } from '@/lib/api-error';
import { brandingKeys } from '@/lib/branding';
import { publicSettingKeys } from '@/lib/public-settings';
import { formatDateTime } from '@/lib/format';
import type { SystemConfiguration } from '@/types/api-response';
import {
    fieldName,
    type SelectOption,
    type SettingField,
    type SettingFormValue,
    type SettingSection,
    toFormValue,
    toPayloadValue,
} from '../settingSections';
import { settingKeys, settingService } from '../services/settingService';

export type SectionValues = Record<string, SettingFormValue>;

interface SettingsSectionProps {
    section: SettingSection;
    items: SystemConfiguration[];
    /** Shows the unsaved values, so a change can be judged before saving. */
    preview?: (values: Partial<SectionValues>) => ReactNode;
}

function initialValues(section: SettingSection, items: SystemConfiguration[]): SectionValues {
    return Object.fromEntries(
        section.fields.map((field, index) => [
            fieldName(field.key),
            toFormValue(field, items[index].value),
        ]),
    );
}

function lastUpdated(items: SystemConfiguration[]): string | undefined {
    const latest = items
        .map((item) => item.updated_at)
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1);

    return latest === undefined ? undefined : `Terakhir diubah ${formatDateTime(latest)}`;
}

function withCurrentOption(options: SelectOption[], value: SettingFormValue): SelectOption[] {
    return typeof value === 'string' && value !== '' && !options.some((o) => o.value === value)
        ? [{ value, label: value }, ...options]
        : options;
}

export function SettingsSection({ section, items, preview }: SettingsSectionProps) {
    const queryClient = useQueryClient();
    const headingId = `settings-${section.id}`;
    // Saved keys move to their next version even when a later key in the same save fails.
    const versions = useRef(new Map(items.map((item) => [item.key, item.version])));
    const saved = useRef(initialValues(section, items));

    const schema = z.object(
        Object.fromEntries(section.fields.map((field) => [fieldName(field.key), field.schema])),
    );
    const form = useForm<SectionValues>({
        resolver: zodResolver(schema),
        defaultValues: initialValues(section, items),
    });

    const watched = useWatch({ control: form.control });

    const save = useMutation<void, ApiError, SectionValues>({
        mutationFn: async (values: SectionValues) => {
            const changed = section.fields.filter(
                (field) => values[fieldName(field.key)] !== saved.current[fieldName(field.key)],
            );

            for (const field of changed) {
                const name = fieldName(field.key);

                try {
                    const updated = await settingService.update(field.key, {
                        value: toPayloadValue(field, values[name]),
                        version: versions.current.get(field.key) ?? 1,
                    });
                    const value = toFormValue(field, updated.value);

                    versions.current.set(field.key, updated.version);
                    saved.current[name] = value;
                    form.resetField(name, { defaultValue: value });
                } catch (error) {
                    const apiError = toApiError(error);
                    const message = apiError.fieldErrors.value?.[0];

                    form.setError(
                        message === undefined ? 'root.server' : name,
                        { type: 'server', message: message ?? apiError.message },
                        { shouldFocus: true },
                    );

                    throw apiError;
                }
            }

            form.reset(saved.current);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: settingKeys.all });
            // The logo display keys reach the sidebar and login page through the branding endpoint.
            void queryClient.invalidateQueries({ queryKey: brandingKeys.all });
            // The company name and time zone are read app-wide from the public settings.
            void queryClient.invalidateQueries({ queryKey: publicSettingKeys.all });
            toast.success(`Pengaturan ${section.title.toLowerCase()} telah disimpan.`);
        },
    });

    const hasVersionConflict = save.error?.code === 'RESOURCE_VERSION_CONFLICT';

    const reload = () => {
        save.reset();
        form.clearErrors();
        void queryClient.invalidateQueries({ queryKey: settingKeys.all });
    };

    const { isDirty } = form.formState;

    return (
        <FormCard
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!isDirty || save.isPending}
                        onClick={() => {
                            save.reset();
                            form.reset(saved.current);
                        }}
                    >
                        Batal
                    </Button>
                    <Button type="submit" disabled={!isDirty || save.isPending}>
                        {section.saveLabel}
                    </Button>
                </>
            }
        >
            <div className="grid gap-0.5">
                <h2 id={headingId} className="text-sm font-semibold">
                    {section.title}
                </h2>
                {lastUpdated(items) !== undefined && (
                    <p className="text-xs text-muted-foreground">{lastUpdated(items)}</p>
                )}
            </div>
            <FormAlert message={form.formState.errors.root?.server?.message} />
            {hasVersionConflict && (
                <Button
                    type="button"
                    variant="outline"
                    className="justify-self-start"
                    onClick={reload}
                >
                    Muat ulang pengaturan
                </Button>
            )}
            {section.fields.map((field) => (
                <SettingInput key={field.key} field={field} form={form} />
            ))}
            {preview?.(watched)}
        </FormCard>
    );
}

interface SettingInputProps {
    field: SettingField;
    form: ReturnType<typeof useForm<SectionValues>>;
}

function SettingInput({ field, form }: SettingInputProps) {
    const name = fieldName(field.key);

    if (field.kind === 'boolean') {
        const id = `setting-${name}`;

        return (
            <Controller
                control={form.control}
                name={name}
                render={({ field: control }) => (
                    <div className="flex items-start gap-2">
                        <Checkbox
                            id={id}
                            checked={control.value === true}
                            onBlur={control.onBlur}
                            onCheckedChange={(checked) => control.onChange(checked === true)}
                        />
                        <div className="grid gap-0.5">
                            <Label htmlFor={id}>{field.label}</Label>
                            {field.description !== undefined && (
                                <p className="font-mono text-xs text-muted-foreground">
                                    {field.description}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            />
        );
    }

    if (field.kind === 'select') {
        return (
            <FormField
                control={form.control}
                name={name}
                label={field.label}
                description={field.description}
                renderControl={(control, attributes) => (
                    <Select
                        value={typeof control.value === 'string' ? control.value : ''}
                        onValueChange={control.onChange}
                    >
                        <SelectTrigger {...attributes} className="w-full" onBlur={control.onBlur}>
                            <SelectValue placeholder={`Pilih ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {withCurrentOption(field.options, control.value).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
        );
    }

    return (
        <FormField
            control={form.control}
            name={name}
            label={field.label}
            description={field.description}
            type={field.inputType}
            maxLength={field.maxLength}
            autoComplete="off"
            renderControl={
                field.uppercase
                    ? (control, attributes) => (
                          <Input
                              {...control}
                              {...attributes}
                              value={typeof control.value === 'string' ? control.value : ''}
                              maxLength={field.maxLength}
                              autoComplete="off"
                              onChange={(event) =>
                                  control.onChange(event.target.value.toUpperCase())
                              }
                          />
                      )
                    : undefined
            }
        />
    );
}
