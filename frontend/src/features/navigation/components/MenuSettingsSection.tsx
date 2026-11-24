import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronDown, House, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type FieldPath, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorState } from '@/components/shared/ErrorState';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { ListSkeleton } from '@/components/shared/skeletons';
import { NavigationIcon } from '@/components/layouts/navigationIcons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ApiError, toApiError } from '@/lib/api-error';
import { applyFormError } from '@/lib/form-errors';
import type {
    LayoutItem,
    LayoutSection,
    NavigationLayout,
    RegisteredMenuItem,
} from '@/types/api-response';
import { navigationKeys, navigationService } from '../services/navigationService';
import { IconPicker } from './IconPicker';

const MAX_SECTIONS = 20;

const layoutSchema = z.object({
    sections: z.array(
        z.object({
            key: z.string(),
            label: z.string().trim().max(50, 'Nama bagian maksimal 50 karakter.').nullable(),
            items: z.array(
                z.object({
                    key: z.string(),
                    label: z.string().trim().max(50, 'Label maksimal 50 karakter.').nullable(),
                    icon: z.string().nullable(),
                    hidden: z.boolean(),
                }),
            ),
        }),
    ),
});

type LayoutValues = z.infer<typeof layoutSchema>;

interface MenuSettingsSectionProps {
    onDirtyChange: (dirty: boolean) => void;
}

export function MenuSettingsSection({ onDirtyChange }: MenuSettingsSectionProps) {
    const query = useQuery({
        queryKey: navigationKeys.layout,
        queryFn: navigationService.layout,
        // A refetch with a newer version would replace unsaved edits.
        refetchOnWindowFocus: false,
    });

    if (query.isPending) {
        return (
            <Card className="p-6">
                <ListSkeleton label="Memuat susunan menu" rows={4} />
            </Card>
        );
    }

    if (query.isError) {
        return (
            <Card className="py-0">
                <ErrorState
                    title="Susunan menu tidak dapat dimuat"
                    message={toApiError(query.error).message}
                    onRetry={() => void query.refetch()}
                />
            </Card>
        );
    }

    // A new version after saving or reloading starts the editor again from the stored layout.
    return (
        <MenuEditor key={query.data.version} layout={query.data} onDirtyChange={onDirtyChange} />
    );
}

interface MenuEditorProps {
    layout: NavigationLayout;
    onDirtyChange: (dirty: boolean) => void;
}

function MenuEditor({ layout, onDirtyChange }: MenuEditorProps) {
    const queryClient = useQueryClient();
    const registered = new Map(layout.items.map((item) => [item.key, item]));
    const form = useForm<LayoutValues>({
        resolver: zodResolver(layoutSchema),
        defaultValues: { sections: layout.sections },
    });
    const sections = useWatch({ control: form.control, name: 'sections' });
    const { isDirty, isSubmitted, errors } = form.formState;
    const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
    const allCollapsed = sections.every((section) => collapsed.has(section.key));

    const toggleSection = (key: string, open: boolean) =>
        setCollapsed((current) => {
            const next = new Set(current);

            if (open) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });

    useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

    const change = (next: LayoutSection[]) =>
        form.setValue('sections', next, { shouldDirty: true, shouldValidate: isSubmitted });

    const save = useMutation({
        mutationFn: (values: LayoutValues) =>
            navigationService.saveLayout(
                values.sections.map((section) => ({
                    ...section,
                    label: section.label || null,
                })),
                layout.version,
            ),
        onSuccess: (saved) => {
            queryClient.setQueryData(navigationKeys.layout, saved);
            void queryClient.invalidateQueries({ queryKey: navigationKeys.all });
            toast.success('Susunan menu telah disimpan.');
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    const hasVersionConflict =
        save.error instanceof ApiError && save.error.code === 'RESOURCE_VERSION_CONFLICT';

    const reload = () => {
        save.reset();
        form.clearErrors();
        void queryClient.invalidateQueries({ queryKey: navigationKeys.layout });
    };

    const errorAt = (path: string): string | undefined =>
        form.getFieldState(path as FieldPath<LayoutValues>, form.formState).error?.message;

    const moveSection = (index: number, offset: number) => {
        const next = [...sections];
        [next[index], next[index + offset]] = [next[index + offset], next[index]];
        change(next);
    };

    const addSection = () => {
        let number = sections.length + 1;

        while (sections.some((section) => section.key === `bagian-${number}`)) {
            number += 1;
        }

        change([...sections, { key: `bagian-${number}`, label: 'Bagian baru', items: [] }]);
    };

    const updateItem = (sectionIndex: number, itemIndex: number, item: LayoutItem) =>
        change(
            sections.map((section, index) =>
                index === sectionIndex
                    ? {
                          ...section,
                          items: section.items.map((current, position) =>
                              position === itemIndex ? item : current,
                          ),
                      }
                    : section,
            ),
        );

    const moveItem = (sectionIndex: number, itemIndex: number, offset: number) => {
        const items = [...sections[sectionIndex].items];
        [items[itemIndex], items[itemIndex + offset]] = [
            items[itemIndex + offset],
            items[itemIndex],
        ];
        change(
            sections.map((section, index) =>
                index === sectionIndex ? { ...section, items } : section,
            ),
        );
    };

    const moveItemToSection = (sectionIndex: number, itemIndex: number, targetKey: string) => {
        const item = sections[sectionIndex].items[itemIndex];

        change(
            sections.map((section, index) => {
                if (index === sectionIndex) {
                    return {
                        ...section,
                        items: section.items.filter((_, position) => position !== itemIndex),
                    };
                }

                return section.key === targetKey
                    ? { ...section, items: [...section.items, item] }
                    : section;
            }),
        );
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
            <FormCard
                onSubmit={form.handleSubmit((values) => save.mutate(values))}
                actions={
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            className="sm:mr-auto"
                            disabled={save.isPending}
                            onClick={() => change(layout.default)}
                        >
                            Kembalikan ke bawaan
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!isDirty || save.isPending}
                            onClick={() => {
                                save.reset();
                                form.reset({ sections: layout.sections });
                            }}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={!isDirty} loading={save.isPending}>
                            Simpan menu
                        </Button>
                    </>
                }
            >
                <div className="grid gap-0.5">
                    <h2 className="text-sm font-semibold">Menu</h2>
                    <p className="text-xs text-muted-foreground">
                        Susunan ini berlaku untuk semua pengguna. Setiap pengguna hanya melihat item
                        yang diizinkan permission-nya, dan menyembunyikan item tidak menutup akses
                        ke halamannya.
                    </p>
                </div>
                <FormAlert message={errors.root?.server?.message ?? errorAt('sections')} />
                {hasVersionConflict && (
                    <Button
                        type="button"
                        variant="outline"
                        className="justify-self-start"
                        onClick={reload}
                    >
                        Muat ulang susunan menu
                    </Button>
                )}
                {sections.length > 1 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={() =>
                            setCollapsed(
                                allCollapsed
                                    ? new Set()
                                    : new Set(sections.map((section) => section.key)),
                            )
                        }
                    >
                        {allCollapsed ? 'Bentangkan semua bagian' : 'Ciutkan semua bagian'}
                    </Button>
                )}
                {sections.map((section, sectionIndex) => {
                    const labelId = `menu-section-${section.key}`;
                    const labelError = errorAt(`sections.${sectionIndex}.label`);
                    const isUntitled = (section.label ?? '').trim() === '';
                    const name = isUntitled
                        ? `tanpa judul ${sectionIndex + 1}`
                        : (section.label ?? '').trim();
                    const describedBy = [
                        isUntitled ? `${labelId}-hint` : undefined,
                        labelError === undefined ? undefined : `${labelId}-error`,
                    ]
                        .filter(Boolean)
                        .join(' ');
                    const itemErrorPaths = section.items.map(
                        (_, itemIndex) => `sections.${sectionIndex}.items.${itemIndex}.label`,
                    );
                    // A section with an invalid item stays open so the error can be seen and fixed.
                    const isOpen =
                        !collapsed.has(section.key) ||
                        itemErrorPaths.some((path) => errorAt(path) !== undefined);
                    const hiddenCount = section.items.filter((item) => item.hidden).length;

                    return (
                        <Collapsible
                            key={section.key}
                            open={isOpen}
                            onOpenChange={(open) => toggleSection(section.key, open)}
                            asChild
                        >
                            <fieldset className="grid gap-3 rounded-lg border p-3">
                                <legend className="sr-only">Bagian {name}</legend>
                                <div className="flex items-end gap-2">
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-lg"
                                            aria-label={`${isOpen ? 'Ciutkan' : 'Bentangkan'} bagian ${name}`}
                                        >
                                            <ChevronDown
                                                aria-hidden="true"
                                                className={isOpen ? undefined : '-rotate-90'}
                                            />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <div className="grid flex-1 gap-1.5">
                                        <Label htmlFor={labelId}>Nama bagian</Label>
                                        <Input
                                            id={labelId}
                                            value={section.label ?? ''}
                                            placeholder="Tanpa judul"
                                            maxLength={50}
                                            aria-invalid={labelError !== undefined}
                                            aria-describedby={describedBy || undefined}
                                            onChange={(event) =>
                                                change(
                                                    sections.map((current, index) =>
                                                        index === sectionIndex
                                                            ? {
                                                                  ...current,
                                                                  label: event.target.value,
                                                              }
                                                            : current,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>
                                    <MoveButtons
                                        noun={`bagian ${name}`}
                                        canMoveUp={sectionIndex > 0}
                                        canMoveDown={sectionIndex < sections.length - 1}
                                        onMove={(offset) => moveSection(sectionIndex, offset)}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Hapus bagian ${name}`}
                                        title={
                                            section.items.length > 0
                                                ? 'Pindahkan semua item sebelum menghapus bagian.'
                                                : undefined
                                        }
                                        disabled={section.items.length > 0}
                                        onClick={() =>
                                            change(
                                                sections.filter(
                                                    (_, index) => index !== sectionIndex,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </div>
                                {!isOpen && (
                                    <p className="pl-11 text-xs text-muted-foreground">
                                        {section.items.length} item
                                        {hiddenCount > 0 && `, ${hiddenCount} disembunyikan`}
                                    </p>
                                )}
                                {isUntitled && (
                                    <p
                                        id={`${labelId}-hint`}
                                        className="text-xs text-muted-foreground"
                                    >
                                        Tanpa judul: item di bagian ini tampil langsung di menu,
                                        sejajar dengan Beranda.
                                    </p>
                                )}
                                {labelError !== undefined && (
                                    <p id={`${labelId}-error`} className="text-xs text-destructive">
                                        {labelError}
                                    </p>
                                )}
                                <CollapsibleContent className="grid gap-3">
                                    {section.items.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            Bagian ini kosong dan tidak tampil di menu. Pindahkan
                                            item ke sini melalui pilihan Bagian pada item.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-2">
                                            {section.items.map((item, itemIndex) => {
                                                const definition = registered.get(item.key);

                                                return definition === undefined ? null : (
                                                    <MenuItemRow
                                                        key={item.key}
                                                        item={item}
                                                        definition={definition}
                                                        icons={layout.icons}
                                                        sections={sections}
                                                        sectionKey={section.key}
                                                        labelError={errorAt(
                                                            itemErrorPaths[itemIndex],
                                                        )}
                                                        canMoveUp={itemIndex > 0}
                                                        canMoveDown={
                                                            itemIndex < section.items.length - 1
                                                        }
                                                        onChange={(next) =>
                                                            updateItem(
                                                                sectionIndex,
                                                                itemIndex,
                                                                next,
                                                            )
                                                        }
                                                        onMove={(offset) =>
                                                            moveItem(
                                                                sectionIndex,
                                                                itemIndex,
                                                                offset,
                                                            )
                                                        }
                                                        onMoveToSection={(target) =>
                                                            moveItemToSection(
                                                                sectionIndex,
                                                                itemIndex,
                                                                target,
                                                            )
                                                        }
                                                    />
                                                );
                                            })}
                                        </ul>
                                    )}
                                </CollapsibleContent>
                            </fieldset>
                        </Collapsible>
                    );
                })}
                <Button
                    type="button"
                    variant="outline"
                    className="justify-self-start"
                    disabled={sections.length >= MAX_SECTIONS}
                    onClick={addSection}
                >
                    <Plus aria-hidden="true" />
                    Tambah bagian
                </Button>
            </FormCard>
            <MenuPreview sections={sections} registered={registered} />
        </div>
    );
}

interface MoveButtonsProps {
    noun: string;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMove: (offset: number) => void;
}

function MoveButtons({ noun, canMoveUp, canMoveDown, onMove }: MoveButtonsProps) {
    return (
        <div className="flex gap-1">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Naikkan ${noun}`}
                disabled={!canMoveUp}
                onClick={() => onMove(-1)}
            >
                <ArrowUp aria-hidden="true" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Turunkan ${noun}`}
                disabled={!canMoveDown}
                onClick={() => onMove(1)}
            >
                <ArrowDown aria-hidden="true" />
            </Button>
        </div>
    );
}

interface MenuItemRowProps {
    item: LayoutItem;
    definition: RegisteredMenuItem;
    icons: string[];
    sections: LayoutSection[];
    sectionKey: string;
    labelError: string | undefined;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onChange: (item: LayoutItem) => void;
    onMove: (offset: number) => void;
    onMoveToSection: (sectionKey: string) => void;
}

function MenuItemRow({
    item,
    definition,
    icons,
    sections,
    sectionKey,
    labelError,
    canMoveUp,
    canMoveDown,
    onChange,
    onMove,
    onMoveToSection,
}: MenuItemRowProps) {
    const id = `menu-item-${item.key}`;

    return (
        <li className="grid gap-2 rounded-md bg-muted/40 p-2 md:grid-cols-[minmax(0,1fr)_10rem_auto_auto] md:items-center">
            <div className="grid gap-1">
                <div className="flex items-center gap-2">
                    <IconPicker
                        value={item.icon}
                        defaultIcon={definition.icon}
                        icons={icons}
                        itemLabel={definition.label}
                        onChange={(icon) => onChange({ ...item, icon })}
                    />
                    <Input
                        id={id}
                        value={item.label ?? ''}
                        placeholder={definition.label}
                        maxLength={50}
                        aria-label={`Label menu ${definition.label}`}
                        aria-invalid={labelError !== undefined}
                        aria-describedby={labelError === undefined ? undefined : `${id}-error`}
                        onChange={(event) =>
                            onChange({
                                ...item,
                                label: event.target.value === '' ? null : event.target.value,
                            })
                        }
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pl-11 text-xs text-muted-foreground">
                    <span>{definition.path}</span>
                    {!definition.module_enabled && (
                        <Badge variant="secondary">Modul nonaktif</Badge>
                    )}
                </div>
                {labelError !== undefined && (
                    <p id={`${id}-error`} className="pl-11 text-xs text-destructive">
                        {labelError}
                    </p>
                )}
            </div>
            <Select value={sectionKey} onValueChange={onMoveToSection}>
                <SelectTrigger
                    aria-label={`Bagian untuk menu ${definition.label}`}
                    className="w-full"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {sections.map((section) => (
                        <SelectItem key={section.key} value={section.key}>
                            {section.label?.trim() || 'Tanpa judul'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
                <Checkbox
                    id={`${id}-visible`}
                    checked={!item.hidden}
                    disabled={!definition.can_hide}
                    aria-label={`Tampilkan menu ${definition.label}`}
                    onCheckedChange={(checked) => onChange({ ...item, hidden: checked !== true })}
                />
                <Label htmlFor={`${id}-visible`} className="font-normal">
                    {definition.can_hide ? 'Tampil' : 'Selalu tampil'}
                </Label>
            </div>
            <MoveButtons
                noun={`menu ${definition.label}`}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMove={onMove}
            />
        </li>
    );
}

interface MenuPreviewProps {
    sections: LayoutSection[];
    registered: Map<string, RegisteredMenuItem>;
}

function MenuPreview({ sections, registered }: MenuPreviewProps) {
    const visible = sections
        .map((section) => ({
            ...section,
            items: section.items.flatMap((item) => {
                const definition = registered.get(item.key);

                return definition === undefined || item.hidden || !definition.module_enabled
                    ? []
                    : [
                          {
                              key: item.key,
                              label: item.label ?? definition.label,
                              icon: item.icon ?? definition.icon,
                          },
                      ];
            }),
        }))
        .filter((section) => section.items.length > 0);

    return (
        <aside
            aria-label="Pratinjau menu"
            className="grid gap-3 rounded-lg border bg-sidebar p-3 text-sm lg:sticky lg:top-20"
        >
            <p className="text-xs font-medium text-muted-foreground">Pratinjau</p>
            <ul className="grid gap-1">
                <li className="flex items-center gap-2">
                    <House aria-hidden="true" className="size-4 text-muted-foreground" />
                    Beranda
                </li>
            </ul>
            {visible.map((section) => (
                <div key={section.key} className="grid gap-1">
                    {section.label?.trim() && (
                        <p className="text-xs font-medium text-muted-foreground">{section.label}</p>
                    )}
                    <ul className="grid gap-1">
                        {section.items.map((item) => (
                            <li key={item.key} className="flex items-center gap-2">
                                <NavigationIcon
                                    name={item.icon}
                                    className="size-4 text-muted-foreground"
                                />
                                {item.label}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            <p className="text-xs text-muted-foreground">
                Pratinjau memuat semua item yang tampil. Setiap pengguna hanya melihat item yang
                diizinkan permission-nya.
            </p>
        </aside>
    );
}
