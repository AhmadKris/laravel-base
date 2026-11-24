import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { ListSkeleton } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiError, toApiError } from '@/lib/api-error';
import { applyFormError } from '@/lib/form-errors';
import type { ModuleSettings } from '@/types/api-response';
import { navigationKeys, navigationService } from '../services/navigationService';

interface ModuleSettingsSectionProps {
    onDirtyChange: (dirty: boolean) => void;
}

export function ModuleSettingsSection({ onDirtyChange }: ModuleSettingsSectionProps) {
    const query = useQuery({
        queryKey: navigationKeys.modules,
        queryFn: navigationService.modules,
        refetchOnWindowFocus: false,
    });

    if (query.isPending) {
        return (
            <Card className="p-6">
                <ListSkeleton label="Memuat daftar modul" rows={4} />
            </Card>
        );
    }

    if (query.isError) {
        return (
            <Card className="py-0">
                <ErrorState
                    title="Daftar modul tidak dapat dimuat"
                    message={toApiError(query.error).message}
                    onRetry={() => void query.refetch()}
                />
            </Card>
        );
    }

    return (
        <ModuleEditor
            key={query.data.version}
            settings={query.data}
            onDirtyChange={onDirtyChange}
        />
    );
}

interface ModuleValues {
    enabled: Record<string, boolean>;
}

interface ModuleEditorProps {
    settings: ModuleSettings;
    onDirtyChange: (dirty: boolean) => void;
}

function ModuleEditor({ settings, onDirtyChange }: ModuleEditorProps) {
    const queryClient = useQueryClient();
    const initial: ModuleValues = {
        enabled: Object.fromEntries(settings.modules.map(({ key, enabled }) => [key, enabled])),
    };
    const form = useForm<ModuleValues>({ defaultValues: initial });
    const enabled = useWatch({ control: form.control, name: 'enabled' });
    const [isConfirming, setIsConfirming] = useState(false);
    const { isDirty, errors } = form.formState;

    useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

    const newlyDisabled = settings.modules.filter(
        (module) => module.enabled && enabled[module.key] === false,
    );

    const save = useMutation({
        mutationFn: () =>
            navigationService.saveModules(
                settings.modules
                    .filter((module) => !module.is_core && enabled[module.key] === false)
                    .map((module) => module.key),
                settings.version,
            ),
        onSuccess: (saved) => {
            setIsConfirming(false);
            queryClient.setQueryData(navigationKeys.modules, saved);
            // The menu and the enabled modules shown across the app come from the navigation.
            void queryClient.invalidateQueries({ queryKey: navigationKeys.all });
            toast.success('Pengaturan modul telah disimpan.');
        },
        onError: (error) => {
            setIsConfirming(false);
            applyFormError(error, form.setError);
        },
    });

    const hasVersionConflict =
        save.error instanceof ApiError && save.error.code === 'RESOURCE_VERSION_CONFLICT';

    const submit = form.handleSubmit(() => {
        if (newlyDisabled.length > 0) {
            setIsConfirming(true);

            return;
        }

        save.mutate();
    });

    return (
        <>
            <FormCard
                onSubmit={submit}
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!isDirty || save.isPending}
                            onClick={() => {
                                save.reset();
                                form.reset(initial);
                            }}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={!isDirty} loading={save.isPending}>
                            Simpan modul
                        </Button>
                    </>
                }
            >
                <div className="grid gap-0.5">
                    <h2 className="text-sm font-semibold">Modul</h2>
                    <p className="text-xs text-muted-foreground">
                        Modul inti selalu aktif. Modul yang dinonaktifkan hilang dari menu, tidak
                        dapat dipakai, dan berhenti membuat data baru. Data yang sudah ada tetap
                        tersimpan.
                    </p>
                </div>
                <FormAlert message={errors.root?.server?.message} />
                {hasVersionConflict && (
                    <Button
                        type="button"
                        variant="outline"
                        className="justify-self-start"
                        onClick={() => {
                            save.reset();
                            form.clearErrors();
                            void queryClient.invalidateQueries({
                                queryKey: navigationKeys.modules,
                            });
                        }}
                    >
                        Muat ulang daftar modul
                    </Button>
                )}
                <ul className="divide-y">
                    {settings.modules.map((module) => {
                        const id = `module-${module.key}`;

                        return (
                            <li
                                key={module.key}
                                className="flex items-start justify-between gap-4 py-3"
                            >
                                <div className="grid gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={id}>{module.label}</Label>
                                        {module.is_core && <Badge variant="secondary">Inti</Badge>}
                                    </div>
                                    <p
                                        id={`${id}-description`}
                                        className="text-xs text-muted-foreground"
                                    >
                                        {module.description}
                                    </p>
                                </div>
                                <Switch
                                    id={id}
                                    checked={enabled[module.key] ?? true}
                                    disabled={module.is_core}
                                    aria-describedby={`${id}-description`}
                                    onCheckedChange={(checked) =>
                                        form.setValue(`enabled.${module.key}`, checked, {
                                            shouldDirty: true,
                                        })
                                    }
                                />
                            </li>
                        );
                    })}
                </ul>
            </FormCard>
            <ConfirmDialog
                open={isConfirming}
                onOpenChange={setIsConfirming}
                title={`Nonaktifkan modul ${newlyDisabled.map((module) => module.label).join(', ')}?`}
                description="Pengguna tidak dapat lagi memakai modul ini dan modul berhenti membuat data baru. Data yang sudah ada tetap tersimpan dan tersedia lagi saat modul diaktifkan."
                confirmLabel="Nonaktifkan modul"
                confirmVariant="warning"
                isPending={save.isPending}
                onConfirm={() => save.mutate()}
            />
        </>
    );
}
