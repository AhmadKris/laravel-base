import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePermission } from '@/hooks/usePermission';
import { ApiError } from '@/lib/api-error';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { applyFormError } from '@/lib/form-errors';
import type { Role } from '@/types/api-response';
import { groupPermissions } from '../permissionGroups';
import { roleSchema, type RoleFormValues } from '../schemas';
import { roleKeys, roleService } from '../services/roleService';

interface RoleFormProps {
    role?: Role;
}

function isSameSelection(first: string[], second: string[]): boolean {
    return first.length === second.length && first.every((name) => second.includes(name));
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

export function RoleForm({ role }: RoleFormProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { can } = usePermission();
    const canEditPermissions = can('permission.assign') && can('permission.view');
    const [permissionQuery, setPermissionQuery] = useState('');
    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: { name: role?.name ?? '', permissions: role?.permissions ?? [] },
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
    const groups = groupPermissions(allPermissions);
    const normalizedQuery = permissionQuery.trim().toLowerCase();
    const visibleGroups =
        normalizedQuery === ''
            ? groups
            : groups
                  .map((group) => ({
                      label: group.label,
                      permissions: group.label.toLowerCase().includes(normalizedQuery)
                          ? group.permissions
                          : group.permissions.filter((name) =>
                                name.toLowerCase().includes(normalizedQuery),
                            ),
                  }))
                  .filter((group) => group.permissions.length > 0);

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
                        description="Pilih permission berdasarkan modul yang boleh diakses role ini."
                    >
                        <Controller
                            control={form.control}
                            name="permissions"
                            render={({ field, fieldState }) => (
                                <fieldset className="grid gap-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <legend className="text-sm leading-none font-medium">
                                            Permission
                                        </legend>
                                        {permissionOptions.isSuccess && (
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {field.value.length} dari {allPermissions.length}{' '}
                                                dipilih
                                            </span>
                                        )}
                                    </div>
                                    {permissionOptions.isPending && (
                                        <ListSkeleton label="Memuat daftar permission" rows={3} />
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
                                    {permissionOptions.isSuccess && allPermissions.length > 0 && (
                                        <SearchInput
                                            label="Cari permission"
                                            placeholder="Cari permission atau modul"
                                            value={permissionQuery}
                                            onChange={setPermissionQuery}
                                        />
                                    )}
                                    {permissionOptions.isSuccess &&
                                        allPermissions.length > 0 &&
                                        visibleGroups.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Tidak ada permission yang cocok dengan pencarian.
                                            </p>
                                        )}
                                    {visibleGroups.map((group) => {
                                        const allGroupSelected = group.permissions.every((name) =>
                                            field.value.includes(name),
                                        );
                                        const toggleGroup = () => {
                                            if (allGroupSelected) {
                                                const hidden = new Set(group.permissions);
                                                field.onChange(
                                                    field.value.filter((item) => !hidden.has(item)),
                                                );

                                                return;
                                            }

                                            const next = new Set(field.value);
                                            group.permissions.forEach((name) => next.add(name));
                                            field.onChange([...next]);
                                        };

                                        return (
                                            <section
                                                key={group.label}
                                                className="grid gap-2 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        {group.label}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-auto px-1.5 py-0.5 text-xs"
                                                        aria-label={
                                                            allGroupSelected
                                                                ? `Kosongkan permission ${group.label}`
                                                                : `Pilih semua permission ${group.label}`
                                                        }
                                                        onClick={toggleGroup}
                                                    >
                                                        {allGroupSelected
                                                            ? 'Kosongkan'
                                                            : 'Pilih semua'}
                                                    </Button>
                                                </div>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {group.permissions.map((name) => {
                                                        const id = `role-permission-${name}`;

                                                        return (
                                                            <div
                                                                key={name}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Checkbox
                                                                    id={id}
                                                                    checked={field.value.includes(
                                                                        name,
                                                                    )}
                                                                    onBlur={field.onBlur}
                                                                    onCheckedChange={(checked) =>
                                                                        field.onChange(
                                                                            checked === true
                                                                                ? [
                                                                                      ...field.value,
                                                                                      name,
                                                                                  ]
                                                                                : field.value.filter(
                                                                                      (item) =>
                                                                                          item !==
                                                                                          name,
                                                                                  ),
                                                                        )
                                                                    }
                                                                />
                                                                <Label htmlFor={id}>{name}</Label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        );
                                    })}
                                    {fieldState.error?.message !== undefined && (
                                        <p className="text-xs text-destructive">
                                            {fieldState.error.message}
                                        </p>
                                    )}
                                </fieldset>
                            )}
                        />
                    </FormSection>
                )}
            </FormCard>
            {guard.dialog}
        </>
    );
}
