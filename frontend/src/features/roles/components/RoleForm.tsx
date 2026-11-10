import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { FormField } from '@/components/shared/FormField';
import { ListSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePermission } from '@/hooks/usePermission';
import { ApiError } from '@/lib/api-error';
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
    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: { name: role?.name ?? '', permissions: role?.permissions ?? [] },
    });

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

    const groups = groupPermissions((permissionOptions.data ?? []).map(({ name }) => name));

    return (
        <FormCard
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            actions={
                <>
                    <Button asChild variant="outline">
                        <Link to={role ? `/roles/${role.id}` : '/roles'}>Batal</Link>
                    </Button>
                    <Button type="submit" disabled={save.isPending}>
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
            <FormField
                control={form.control}
                name="name"
                label="Nama"
                autoComplete="off"
                disabled={role?.is_protected}
                description={
                    role?.is_protected ? 'Nama role bawaan tidak dapat diubah.' : undefined
                }
            />
            {canEditPermissions && (
                <Controller
                    control={form.control}
                    name="permissions"
                    render={({ field, fieldState }) => (
                        <fieldset className="grid gap-3">
                            <legend className="mb-1.5 text-sm leading-none font-medium">
                                Permission
                            </legend>
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
                            {groups.map((group) => (
                                <div key={group.label} className="grid gap-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {group.label}
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {group.permissions.map((name) => {
                                            const id = `role-permission-${name}`;

                                            return (
                                                <div key={name} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={id}
                                                        checked={field.value.includes(name)}
                                                        onBlur={field.onBlur}
                                                        onCheckedChange={(checked) =>
                                                            field.onChange(
                                                                checked === true
                                                                    ? [...field.value, name]
                                                                    : field.value.filter(
                                                                          (item) => item !== name,
                                                                      ),
                                                            )
                                                        }
                                                    />
                                                    <Label htmlFor={id}>{name}</Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {fieldState.error?.message !== undefined && (
                                <p className="text-xs text-destructive">
                                    {fieldState.error.message}
                                </p>
                            )}
                        </fieldset>
                    )}
                />
            )}
        </FormCard>
    );
}
