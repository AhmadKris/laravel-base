import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks/usePermission';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { ApiError } from '@/lib/api-error';
import { applyFormError } from '@/lib/form-errors';
import type { Permission, Role } from '@/types/api-response';
import {
    addPermissionsWithPrerequisites,
    diffPermissions,
    groupPermissions,
    type PermissionGroup,
    removePermissionsWithDependents,
    toCatalog,
} from '../permissionGroups';
import { roleSchema, type RoleFormValues } from '../schemas';
import { roleKeys, roleService } from '../services/roleService';
import { PermissionMatrix } from './PermissionMatrix';

interface RoleFormProps {
    role?: Role;
    /** A role to copy into a new one. Only permissions the actor may grant are copied. */
    source?: Role;
}

type PermissionFilterMode = 'all' | 'selected';

function isSameSelection(first: string[], second: string[]): boolean {
    return first.length === second.length && first.every((name) => second.includes(name));
}

function matchesPermissionSearch(permission: Permission, query: string): boolean {
    return [permission.group_label, permission.name, permission.label, permission.description].some(
        (text) => text.toLowerCase().includes(query),
    );
}

function saveRole(
    role: Role | undefined,
    values: RoleFormValues,
    canEditPermissions: boolean,
): Promise<Role> {
    const description = values.description === '' ? null : values.description;

    if (role === undefined) {
        return roleService.create({
            name: values.name,
            ...(description !== null ? { description } : {}),
            ...(canEditPermissions && values.permissions.length > 0
                ? { permissions: values.permissions }
                : {}),
        });
    }

    return roleService.update(role.id, {
        ...(role.is_protected ? {} : { name: values.name }),
        ...(description !== (role.description ?? null) ? { description } : {}),
        ...(canEditPermissions && !isSameSelection(values.permissions, role.permissions ?? [])
            ? { permissions: values.permissions, version: role.version }
            : {}),
    });
}

export function RoleForm({ role, source }: RoleFormProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { can } = usePermission();
    const canEditPermissions = can('permission.assign') && can('permission.view');
    const [permissionQuery, setPermissionQuery] = useState('');
    const [filterMode, setFilterMode] = useState<PermissionFilterMode>('all');
    const initialPermissions = role?.permissions ?? [];
    const sourcePermissions = canEditPermissions ? (source?.permissions ?? []) : [];
    const copiedPermissions = sourcePermissions.filter((name) => can(name));
    const skippedCount = sourcePermissions.length - copiedPermissions.length;
    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: role?.name ?? (source !== undefined ? `Salinan ${source.name}` : ''),
            description: role?.description ?? source?.description ?? '',
            permissions: role !== undefined ? initialPermissions : copiedPermissions,
        },
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

    const allPermissions = permissionOptions.data ?? [];
    const catalog = toCatalog(allPermissions);
    const groups = groupPermissions(allPermissions);
    const normalizedQuery = permissionQuery.trim().toLowerCase();
    const hasLockedPermission = allPermissions.some(({ name }) => !can(name));

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
                {skippedCount > 0 && (
                    <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                        <AlertTriangle
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-warning"
                        />
                        {skippedCount} izin dari role {source?.name} tidak disalin karena berada di
                        luar kewenangan Anda.
                    </p>
                )}
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
                    <FormField
                        control={form.control}
                        name="description"
                        label="Deskripsi"
                        description="Jelaskan untuk siapa role ini, agar mudah dipilih saat menetapkan role pengguna."
                        renderControl={(field, attributes) => (
                            <Textarea {...field} {...attributes} rows={3} maxLength={500} />
                        )}
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
                                // A row stays whole when one of its permissions matches, so the
                                // columns keep their meaning.
                                const visibleGroups = groups.filter((group) =>
                                    group.permissions.some(
                                        (permission) =>
                                            (filterMode === 'all' ||
                                                field.value.includes(permission.name)) &&
                                            matchesPermissionSearch(permission, normalizedQuery),
                                    ),
                                );

                                const changes = diffPermissions(initialPermissions, field.value);
                                const hasPermissionChanges =
                                    changes.added.length > 0 || changes.removed.length > 0;

                                const toggleOne = (name: string, checked: boolean) => {
                                    field.onChange(
                                        checked
                                            ? addPermissionsWithPrerequisites(
                                                  field.value,
                                                  [name],
                                                  catalog,
                                                  can,
                                              )
                                            : removePermissionsWithDependents(
                                                  field.value,
                                                  [name],
                                                  catalog,
                                              ),
                                    );
                                };

                                const toggleGroup = (
                                    group: PermissionGroup,
                                    selectAll: boolean,
                                ) => {
                                    const names = group.permissions.map(({ name }) => name);

                                    field.onChange(
                                        selectAll
                                            ? addPermissionsWithPrerequisites(
                                                  field.value,
                                                  names,
                                                  catalog,
                                                  can,
                                              )
                                            : removePermissionsWithDependents(
                                                  field.value,
                                                  names,
                                                  catalog,
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
                                        {visibleGroups.length > 0 && (
                                            <>
                                                <p className="text-xs text-muted-foreground">
                                                    Memilih izin ikut memilih izin yang
                                                    dibutuhkannya, dan mencabutnya ikut mencabut
                                                    izin yang bergantung padanya.
                                                    {hasLockedPermission &&
                                                        ' Izin yang tidak dapat dipilih berada di luar kewenangan akun Anda.'}
                                                </p>
                                                <PermissionMatrix
                                                    groups={visibleGroups}
                                                    catalog={catalog}
                                                    selected={field.value}
                                                    canGrant={can}
                                                    onBlur={field.onBlur}
                                                    onToggleOne={toggleOne}
                                                    onToggleGroup={toggleGroup}
                                                />
                                            </>
                                        )}
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
