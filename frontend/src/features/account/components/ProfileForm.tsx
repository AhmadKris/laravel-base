import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { FormField } from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { applyFormError } from '@/lib/form-errors';
import type { Account } from '@/types/api-response';
import { useSyncAuthUser } from '../hooks/useSyncAuthUser';
import { profileSchema, type ProfileValues } from '../schemas';
import { accountService } from '../services/accountService';
import { AvatarField } from './AvatarField';

interface ProfileFormProps {
    account: Account;
    onDirtyChange: (dirty: boolean) => void;
}

export function ProfileForm({ account, onDirtyChange }: ProfileFormProps) {
    const syncAuthUser = useSyncAuthUser();
    const saved: ProfileValues = { name: account.name, phone: account.phone ?? '' };
    const form = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: saved,
    });
    const { isDirty } = form.formState;

    useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

    const save = useMutation({
        mutationFn: (values: ProfileValues) =>
            accountService.update({ name: values.name, phone: values.phone || null }),
        onSuccess: (updated) => {
            syncAuthUser(updated);
            form.reset({ name: updated.name, phone: updated.phone ?? '' });
            toast.success('Profil telah disimpan.');
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    return (
        <FormCard
            isDirty={isDirty}
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!isDirty || save.isPending}
                        onClick={() => form.reset(saved)}
                    >
                        Batal
                    </Button>
                    <Button type="submit" disabled={!isDirty} loading={save.isPending}>
                        Simpan profil
                    </Button>
                </>
            }
        >
            <h2 className="text-sm font-semibold">Profil</h2>
            <AvatarField account={account} />
            <FormAlert message={form.formState.errors.root?.server?.message} />
            <FormField
                control={form.control}
                name="name"
                label="Nama"
                autoComplete="name"
                maxLength={150}
                required
            />
            <FormField
                control={form.control}
                name="phone"
                label="Telepon"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                description="Opsional. Tampil bagi admin di detail pengguna."
            />
        </FormCard>
    );
}
