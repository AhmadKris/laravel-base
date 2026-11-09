import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { FormField } from '@/components/shared/FormField';
import { PasswordField } from '@/components/shared/PasswordField';
import { ListSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NEW_PASSWORD_HINT } from '@/features/authentication/schemas';
import { usePermission } from '@/hooks/usePermission';
import { applyFormError } from '@/lib/form-errors';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/api-response';
import { userFormSchema, type UserFormValues } from '../schemas';
import { userKeys, userService } from '../services/userService';

interface UserFormProps {
    user?: User;
}

function isSameSelection(first: string[], second: string[]): boolean {
    return first.length === second.length && first.every((role) => second.includes(role));
}

function saveUser(
    user: User | undefined,
    values: UserFormValues,
    canEditRoles: boolean,
): Promise<User> {
    const identity = {
        name: values.name,
        email: values.email,
        username: values.username === '' ? null : values.username,
    };

    if (user === undefined) {
        return userService.create({
            ...identity,
            password: values.password,
            ...(canEditRoles && values.roles.length > 0 ? { roles: values.roles } : {}),
        });
    }

    return userService.update(user.id, {
        ...identity,
        ...(canEditRoles && !isSameSelection(values.roles, user.roles ?? [])
            ? { roles: values.roles }
            : {}),
    });
}

export function UserForm({ user }: UserFormProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { can } = usePermission();
    const currentUserId = useAuthStore((state) => state.user?.id);
    const canEditRoles = can('user.assign_role') && can('role.view') && user?.id !== currentUserId;
    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema(user === undefined)),
        defaultValues: {
            name: user?.name ?? '',
            email: user?.email ?? '',
            username: user?.username ?? '',
            password: '',
            roles: user?.roles ?? [],
        },
    });

    const roleOptions = useQuery({
        queryKey: userKeys.roleOptions,
        queryFn: userService.listRoleOptions,
        enabled: canEditRoles,
    });

    const save = useMutation({
        mutationFn: (values: UserFormValues) => saveUser(user, values, canEditRoles),
        onSuccess: (saved) => {
            const { user: currentUser, setUser } = useAuthStore.getState();

            if (currentUser?.id === saved.id) {
                setUser({ ...currentUser, name: saved.name, email: saved.email });
            }

            void queryClient.invalidateQueries({ queryKey: userKeys.all });
            toast.success(`Pengguna ${saved.name} telah disimpan.`);
            void navigate(`/users/${saved.id}`, { replace: true });
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <FormCard
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            actions={
                <>
                    <Button asChild variant="outline">
                        <Link to={user ? `/users/${user.id}` : '/users'}>Batal</Link>
                    </Button>
                    <Button type="submit" disabled={save.isPending}>
                        Simpan pengguna
                    </Button>
                </>
            }
        >
            <FormAlert message={form.formState.errors.root?.server?.message} />
            <FormField control={form.control} name="name" label="Nama" autoComplete="off" />
            <FormField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="off"
            />
            <FormField
                control={form.control}
                name="username"
                label="Username (opsional)"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                description="Dapat dipakai untuk masuk selain email."
            />
            {user === undefined && (
                <PasswordField
                    control={form.control}
                    name="password"
                    label="Password awal"
                    autoComplete="new-password"
                    description={NEW_PASSWORD_HINT}
                />
            )}
            {canEditRoles && (
                <Controller
                    control={form.control}
                    name="roles"
                    render={({ field, fieldState }) => (
                        <fieldset className="grid gap-2">
                            <legend className="mb-1.5 text-sm leading-none font-medium">
                                Role
                            </legend>
                            {roleOptions.isPending && (
                                <ListSkeleton label="Memuat daftar role" rows={2} />
                            )}
                            {roleOptions.isError && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-destructive">
                                        Daftar role tidak dapat dimuat.
                                    </span>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0"
                                        onClick={() => void roleOptions.refetch()}
                                    >
                                        Coba lagi
                                    </Button>
                                </div>
                            )}
                            {roleOptions.isSuccess && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {roleOptions.data.map((role) => {
                                        const id = `user-role-${role.id}`;

                                        return (
                                            <div key={role.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={id}
                                                    checked={field.value.includes(role.name)}
                                                    onBlur={field.onBlur}
                                                    onCheckedChange={(checked) =>
                                                        field.onChange(
                                                            checked === true
                                                                ? [...field.value, role.name]
                                                                : field.value.filter(
                                                                      (name) => name !== role.name,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                <Label htmlFor={id}>{role.name}</Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
