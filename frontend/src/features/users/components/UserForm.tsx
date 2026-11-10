import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { FormField } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { PasswordField } from '@/components/shared/PasswordField';
import { SearchInput } from '@/components/shared/SearchInput';
import { ListSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NEW_PASSWORD_HINT } from '@/features/authentication/schemas';
import { usePermission } from '@/hooks/usePermission';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
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
    const [roleQuery, setRoleQuery] = useState('');
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
    const guard = useUnsavedChangesGuard(form.formState.isDirty);

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

            queryClient.setQueryData(userKeys.detail(saved.id), saved);
            void queryClient.invalidateQueries({ queryKey: userKeys.all });
            toast.success(`Pengguna ${saved.name} telah disimpan.`);
            guard.allowNavigation();
            void navigate(`/users/${saved.id}`, { replace: true });
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    const filteredRoles = (roleOptions.data ?? []).filter((role) =>
        role.name.toLowerCase().includes(roleQuery.trim().toLowerCase()),
    );

    return (
        <>
            <FormCard
                isDirty={form.formState.isDirty}
                onSubmit={form.handleSubmit((values) => save.mutate(values))}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link to={user ? `/users/${user.id}` : '/users'}>Batal</Link>
                        </Button>
                        <Button type="submit" loading={save.isPending}>
                            Simpan pengguna
                        </Button>
                    </>
                }
            >
                <FormAlert message={form.formState.errors.root?.server?.message} />
                <FormSection
                    title="Identitas akun"
                    description="Nama, email, dan username untuk masuk ke aplikasi."
                >
                    <FormField
                        control={form.control}
                        name="name"
                        label="Nama"
                        autoComplete="off"
                        required
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        label="Email"
                        type="email"
                        autoComplete="off"
                        required
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
                </FormSection>
                {user === undefined && (
                    <FormSection
                        title="Kredensial"
                        description="Password awal yang diberikan untuk pengguna baru."
                    >
                        <PasswordField
                            control={form.control}
                            name="password"
                            label="Password awal"
                            autoComplete="new-password"
                            required
                            showLengthHint
                            description={NEW_PASSWORD_HINT}
                        />
                    </FormSection>
                )}
                {canEditRoles && (
                    <FormSection
                        title="Hak akses"
                        description="Tetapkan satu atau beberapa role untuk pengguna ini."
                    >
                        <Controller
                            control={form.control}
                            name="roles"
                            render={({ field, fieldState }) => (
                                <fieldset className="grid gap-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <legend className="text-sm leading-none font-medium">
                                            Role
                                        </legend>
                                        {roleOptions.isSuccess && (
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {field.value.length} role dipilih
                                            </span>
                                        )}
                                    </div>
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
                                    {roleOptions.isSuccess && roleOptions.data.length > 6 && (
                                        <SearchInput
                                            label="Cari role"
                                            placeholder="Cari nama role"
                                            value={roleQuery}
                                            onChange={setRoleQuery}
                                        />
                                    )}
                                    {roleOptions.isSuccess && filteredRoles.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Tidak ada role yang cocok dengan pencarian.
                                        </p>
                                    )}
                                    {roleOptions.isSuccess && filteredRoles.length > 0 && (
                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                            {filteredRoles.map((role) => {
                                                const id = `user-role-${role.id}`;
                                                const descId = `${id}-description`;
                                                const isLocked = !role.can_assign;

                                                return (
                                                    <div
                                                        key={role.id}
                                                        className={cn(
                                                            'flex items-start gap-2.5 rounded-md border p-3 transition-colors',
                                                            field.value.includes(role.name)
                                                                ? 'border-primary/40 bg-primary/5'
                                                                : 'border-border/80',
                                                            isLocked && 'opacity-75',
                                                        )}
                                                    >
                                                        <Checkbox
                                                            id={id}
                                                            checked={field.value.includes(
                                                                role.name,
                                                            )}
                                                            disabled={isLocked}
                                                            aria-describedby={descId}
                                                            className="mt-0.5"
                                                            onBlur={field.onBlur}
                                                            onCheckedChange={(checked) => {
                                                                if (isLocked) {
                                                                    return;
                                                                }

                                                                field.onChange(
                                                                    checked === true
                                                                        ? [
                                                                              ...field.value,
                                                                              role.name,
                                                                          ]
                                                                        : field.value.filter(
                                                                              (name) =>
                                                                                  name !==
                                                                                  role.name,
                                                                          ),
                                                                );
                                                            }}
                                                        />
                                                        <div className="grid min-w-0 gap-0.5 leading-snug">
                                                            <Label
                                                                htmlFor={id}
                                                                className={
                                                                    isLocked
                                                                        ? 'cursor-not-allowed'
                                                                        : 'cursor-pointer'
                                                                }
                                                            >
                                                                {role.name}
                                                            </Label>
                                                            <p
                                                                id={descId}
                                                                className="text-xs text-muted-foreground tabular-nums"
                                                            >
                                                                {role.is_protected
                                                                    ? 'Role bawaan'
                                                                    : 'Role kustom'}{' '}
                                                                - {role.permissions_count ?? 0} hak
                                                                akses
                                                            </p>
                                                            {isLocked && (
                                                                <p className="text-xs text-warning">
                                                                    Di luar kewenangan Anda untuk
                                                                    menetapkan atau mencabut role
                                                                    ini.
                                                                </p>
                                                            )}
                                                        </div>
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
                    </FormSection>
                )}
            </FormCard>
            {guard.dialog}
        </>
    );
}
