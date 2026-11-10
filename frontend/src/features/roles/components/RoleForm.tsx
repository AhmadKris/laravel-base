import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { FormField } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { SearchInput } from '@/components/shared/SearchInput';
import { ListSkeleton } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePermission } from '@/hooks/usePermission';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { ApiError } from '@/lib/api-error';
import { applyFormError } from '@/lib/form-errors';
import type { Role } from '@/types/api-response';
import {
    addPermissionsWithPrerequisites,
    describePermission,
    diffPermissions,
    findSelectedDependents,
    groupPermissions,
    type PermissionGroup,
    removePermissionsWithDependents,
} from '../permissionGroups';
import { roleSchema, type RoleFormValues } from '../schemas';
import { roleKeys, roleService } from '../services/roleService';

interface RoleFormProps {
    role?: Role;
}

type PermissionFilterMode = 'all' | 'selected';

function isSameSelection(first: string[], second: string[]): boolean {
    return first.length === second.length && first.every((name) => second.includes(name));
}

function matchesPermissionSearch(name: string, groupLabel: string, query: string): boolean {
    if (query === '') {
        return true;
    }

    if (groupLabel.toLowerCase().includes(query) || name.toLowerCase().includes(query)) {
        return true;
    }

    const meta = describePermission(name);

    return (
        meta.label.toLowerCase().includes(query) || meta.description.toLowerCase().includes(query)
    );
}

function saveRole(
    role: Role | undefined,
    values: RoleFormValues,
    canEditPermissions: boolean,
): Promise<Role> {
    if (role === undefined) {
        return roleService.create({
            name: values.name,
            ...(canEditPermissions && values.permissions.length > 0
                ? { permissions: values.permissions }
                : {}),
        });
    }

    return roleService.update(role.id, {
        ...(role.is_protected ? {} : { name: values.name }),
        ...(canEditPermissions && !isSameSelection(values.permissions, role.permissions ?? [])
            ? { permissions: values.permissions, version: role.version }
            : {}),
    });
}

interface PermissionOptionRowProps {
    name: string;
    selected: string[];
    canGrant: (name: string) => boolean;
    onBlur: () => void;
    onToggle: (name: string, checked: boolean) => void;
}

function PermissionOptionRow({
    name,
    selected,
    canGrant,
    onBlur,
    onToggle,
}: PermissionOptionRowProps) {
    const id = `role-permission-${name}`;
    const descId = `${id}-description`;
    const meta = describePermission(name);
    const isChecked = selected.includes(name);
    const isLockedByAuthority = !isChecked && !canGrant(name);
    const prerequisiteLabels = (meta.requires ?? []).map((req) => describePermission(req).label);
    const activeDependents = isChecked ? findSelectedDependents(name, selected) : [];

    return (
        <div
            className={cn(
                'flex items-start gap-2.5 rounded-md border p-3 transition-colors',
                isChecked ? 'border-primary/40 bg-primary/5' : 'border-border/80',
                isLockedByAuthority && 'opacity-75',
            )}
        >
            <Checkbox
                id={id}
                checked={isChecked}
                disabled={isLockedByAuthority}
                aria-describedby={descId}
                className="mt-0.5"
                onBlur={onBlur}
                onCheckedChange={(checked) => onToggle(name, checked === true)}
            />
            <div className="grid min-w-0 gap-1 leading-snug">
                <Label
                    htmlFor={id}
                    className={cn(
                        'flex flex-col items-start gap-0.5 font-normal',
                        isLockedByAuthority ? 'cursor-not-allowed' : 'cursor-pointer',
                    )}
                >
                    <span className="text-sm font-medium text-foreground">{meta.label}</span>
                    <code className="font-mono text-xs text-muted-foreground">{name}</code>
                </Label>
                <p id={descId} className="text-xs text-muted-foreground">
                    {meta.description}
                </p>
                {isLockedByAuthority && (
                    <p className="text-xs text-warning">
                        Di luar kewenangan Anda (akun Anda tidak memiliki izin ini).
                    </p>
                )}
                {!isLockedByAuthority && prerequisiteLabels.length > 0 && !isChecked && (
                    <p className="text-xs text-muted-foreground">
                        Otomatis mengaktifkan: {prerequisiteLabels.join(', ')}.
                    </p>
                )}
                {activeDependents.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Dibutuhkan oleh: {activeDependents.map((item) => item.label).join(', ')}.
                    </p>
                )}
            </div>
        </div>
    );
}

interface PermissionModuleProps {
    group: PermissionGroup;
    selected: string[];
    canGrant: (name: string) => boolean;
    onBlur: () => void;
    onToggleOne: (name: string, checked: boolean) => void;
    onToggleGroup: (group: PermissionGroup, selectAll: boolean) => void;
}

function PermissionModule({
    group,
    selected,
    canGrant,
    onBlur,
    onToggleOne,
    onToggleGroup,
}: PermissionModuleProps) {
    const selectedInGroup = group.permissions.filter((name) => selected.includes(name)).length;
    const controllable = group.permissions.filter(
        (name) => selected.includes(name) || canGrant(name),
    );
    const allGroupSelected =
        controllable.length > 0 && controllable.every((name) => selected.includes(name));
    const someGroupSelected = selectedInGroup > 0 && !allGroupSelected;
    const groupCheckboxId = `role-module-${group.key}`;

    return (
        <section className="overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                    <Checkbox
                        id={groupCheckboxId}
                        checked={
                            allGroupSelected ? true : someGroupSelected ? 'indeterminate' : false
                        }
                        disabled={controllable.length === 0}
                        aria-label={`Pilih semua modul ${group.label}`}
                        onCheckedChange={() => onToggleGroup(group, !allGroupSelected)}
                    />
                    <Label htmlFor={groupCheckboxId} className="cursor-pointer text-sm font-medium">
                        {group.label}
                    </Label>
                    <Badge variant="secondary" className="tabular-nums">
                        {selectedInGroup}/{group.permissions.length}
                    </Badge>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={controllable.length === 0}
                    className="h-auto px-2 py-1 text-xs"
                    aria-label={
                        allGroupSelected
                            ? `Kosongkan permission ${group.label}`
                            : `Pilih semua permission ${group.label}`
                    }
                    onClick={() => onToggleGroup(group, !allGroupSelected)}
                >
                    {allGroupSelected ? 'Kosongkan' : 'Pilih semua'}
                </Button>
            </div>
            <div className="grid gap-2.5 p-3 sm:grid-cols-2">
                {group.permissions.map((name) => (
                    <PermissionOptionRow
                        key={name}
                        name={name}
                        selected={selected}
                        canGrant={canGrant}
                        onBlur={onBlur}
                        onToggle={onToggleOne}
                    />
                ))}
            </div>
        </section>
    );
}

export function RoleForm({ role }: RoleFormProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { can } = usePermission();
    const canEditPermissions = can('permission.assign') && can('permission.view');
    const [permissionQuery, setPermissionQuery] = useState('');
    const [filterMode, setFilterMode] = useState<PermissionFilterMode>('all');
    const initialPermissions = role?.permissions ?? [];
    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: { name: role?.name ?? '', permissions: initialPermissions },
    });
    const guard = useUnsavedChangesGuard(form.formState.isDirty);

    const permissionOptions = useQuery({
        queryKey: roleKeys.permissions,
        queryFn: roleService.listPermissions,
        enabled: canEditPermissions,
    });

    const save = useMutation({
        mutationFn: (values: RoleFormValues) => saveRole(role, values, canEditPermissions),
        onSuccess: (saved) => {
            queryClient.setQueryData(roleKeys.detail(String(saved.id)), saved);
            void queryClient.invalidateQueries({ queryKey: roleKeys.all });
            toast.success(`Role ${saved.name} telah disimpan.`);
            guard.allowNavigation();
            void navigate(`/roles/${saved.id}`, { replace: true });
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    const hasVersionConflict =
        save.error instanceof ApiError && save.error.code === 'RESOURCE_VERSION_CONFLICT';

    const reloadRole = () => {
        save.reset();
        form.clearErrors();

        if (role !== undefined) {
            void queryClient.invalidateQueries({ queryKey: roleKeys.detail(String(role.id)) });
        }
    };

    const allPermissions = (permissionOptions.data ?? []).map(({ name }) => name);
    const availableSet = new Set(allPermissions);
    const groups = groupPermissions(allPermissions);
    const normalizedQuery = permissionQuery.trim().toLowerCase();

    return (
        <>
            <FormCard
                isDirty={form.formState.isDirty}
                onSubmit={form.handleSubmit((values) => save.mutate(values))}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link to={role ? `/roles/${role.id}` : '/roles'}>Batal</Link>
                        </Button>
                        <Button type="submit" loading={save.isPending}>
                            Simpan role
                        </Button>
                    </>
                }
            >
                <FormAlert message={form.formState.errors.root?.server?.message} />
                {hasVersionConflict && (
                    <Button
                        type="button"
                        variant="outline"
                        className="justify-self-start"
                        onClick={reloadRole}
                    >
                        Muat ulang data role
                    </Button>
                )}
                <FormSection title="Informasi role">
                    <FormField
                        control={form.control}
                        name="name"
                        label="Nama"
                        autoComplete="off"
                        required={!role?.is_protected}
                        disabled={role?.is_protected}
                        description={
                            role?.is_protected ? 'Nama role bawaan tidak dapat diubah.' : undefined
                        }
                    />
                </FormSection>
                {canEditPermissions && (
                    <FormSection
                        title="Hak akses"
                        description="Pilih modul dan izin yang boleh diakses role ini."
                    >
                        <Controller
                            control={form.control}
                            name="permissions"
                            render={({ field, fieldState }) => {
                                const visibleGroups = groups
                                    .map((group) => ({
                                        ...group,
                                        permissions: group.permissions.filter((name) => {
                                            if (
                                                filterMode === 'selected' &&
                                                !field.value.includes(name)
                                            ) {
                                                return false;
                                            }

                                            return matchesPermissionSearch(
                                                name,
                                                group.label,
                                                normalizedQuery,
                                            );
                                        }),
                                    }))
                                    .filter((group) => group.permissions.length > 0);

                                const changes = diffPermissions(initialPermissions, field.value);
                                const hasPermissionChanges =
                                    changes.added.length > 0 || changes.removed.length > 0;

                                const toggleOne = (name: string, checked: boolean) => {
                                    field.onChange(
                                        checked
                                            ? addPermissionsWithPrerequisites(
                                                  field.value,
                                                  [name],
                                                  availableSet,
                                                  can,
                                              )
                                            : removePermissionsWithDependents(field.value, [name]),
                                    );
                                };

                                const toggleGroup = (
                                    group: PermissionGroup,
                                    selectAll: boolean,
                                ) => {
                                    field.onChange(
                                        selectAll
                                            ? addPermissionsWithPrerequisites(
                                                  field.value,
                                                  group.permissions,
                                                  availableSet,
                                                  can,
                                              )
                                            : removePermissionsWithDependents(
                                                  field.value,
                                                  group.permissions,
                                              ),
                                    );
                                };

                                return (
                                    <fieldset className="grid gap-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <legend className="text-sm leading-none font-medium">
                                                Permission
                                            </legend>
                                            {permissionOptions.isSuccess && (
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                    {field.value.length} dari{' '}
                                                    {allPermissions.length} dipilih
                                                </span>
                                            )}
                                        </div>
                                        {role !== undefined &&
                                            (role.users_count ?? 0) > 0 &&
                                            hasPermissionChanges && (
                                                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
                                                    <AlertTriangle
                                                        aria-hidden="true"
                                                        className="mt-0.5 size-4 shrink-0 text-warning"
                                                    />
                                                    <span>
                                                        Perubahan hak akses langsung berlaku untuk{' '}
                                                        <span className="font-medium tabular-nums">
                                                            {role.users_count} pengguna
                                                        </span>{' '}
                                                        yang memakai role ini.
                                                    </span>
                                                </div>
                                            )}
                                        {permissionOptions.isPending && (
                                            <ListSkeleton
                                                label="Memuat daftar permission"
                                                rows={3}
                                            />
                                        )}
                                        {permissionOptions.isError && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-destructive">
                                                    Daftar permission tidak dapat dimuat.
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto p-0"
                                                    onClick={() => void permissionOptions.refetch()}
                                                >
                                                    Coba lagi
                                                </Button>
                                            </div>
                                        )}
                                        {permissionOptions.isSuccess &&
                                            allPermissions.length > 0 && (
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <SearchInput
                                                        label="Cari permission"
                                                        placeholder="Cari nama izin, modul, atau kode"
                                                        value={permissionQuery}
                                                        onChange={setPermissionQuery}
                                                    />
                                                    <div
                                                        role="group"
                                                        aria-label="Filter status permission"
                                                        className="flex items-center gap-1.5"
                                                    >
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={
                                                                filterMode === 'all'
                                                                    ? 'secondary'
                                                                    : 'ghost'
                                                            }
                                                            aria-pressed={filterMode === 'all'}
                                                            onClick={() => setFilterMode('all')}
                                                        >
                                                            Semua
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={
                                                                filterMode === 'selected'
                                                                    ? 'secondary'
                                                                    : 'ghost'
                                                            }
                                                            aria-pressed={filterMode === 'selected'}
                                                            onClick={() =>
                                                                setFilterMode('selected')
                                                            }
                                                        >
                                                            Dipilih ({field.value.length})
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        {permissionOptions.isSuccess &&
                                            allPermissions.length > 0 &&
                                            visibleGroups.length === 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    {filterMode === 'selected' &&
                                                    field.value.length === 0
                                                        ? 'Belum ada permission yang dipilih.'
                                                        : 'Tidak ada permission yang cocok dengan pencarian.'}
                                                </p>
                                            )}
                                        <div className="grid gap-3">
                                            {visibleGroups.map((group) => (
                                                <PermissionModule
                                                    key={group.key}
                                                    group={group}
                                                    selected={field.value}
                                                    canGrant={can}
                                                    onBlur={field.onBlur}
                                                    onToggleOne={toggleOne}
                                                    onToggleGroup={toggleGroup}
                                                />
                                            ))}
                                        </div>
                                        {role !== undefined && hasPermissionChanges && (
                                            <div className="flex flex-wrap items-center gap-2 border-t pt-2.5 text-xs text-muted-foreground">
                                                <span>Perubahan belum disimpan:</span>
                                                {changes.added.length > 0 && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="tabular-nums"
                                                    >
                                                        +{changes.added.length} ditambah
                                                    </Badge>
                                                )}
                                                {changes.removed.length > 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="tabular-nums"
                                                    >
                                                        -{changes.removed.length} dicabut
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                        {fieldState.error?.message !== undefined && (
                                            <p className="text-xs text-destructive">
                                                {fieldState.error.message}
                                            </p>
                                        )}
                                    </fieldset>
                                );
                            }}
                        />
                    </FormSection>
                )}
            </FormCard>
            {guard.dialog}
        </>
    );
}
