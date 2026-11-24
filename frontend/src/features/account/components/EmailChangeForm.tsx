import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/shared/FormAlert';
import { FormCard } from '@/components/shared/FormCard';
import { FormField } from '@/components/shared/FormField';
import { PasswordField } from '@/components/shared/PasswordField';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { applyFormError } from '@/lib/form-errors';
import { notifyError } from '@/lib/notify';
import type { Account } from '@/types/api-response';
import { emailChangeSchema, type EmailChangeValues } from '../schemas';
import { accountKeys, accountService } from '../services/accountService';

interface EmailChangeFormProps {
    account: Account;
    onDirtyChange: (dirty: boolean) => void;
}

const EMPTY: EmailChangeValues = { email: '', current_password: '' };

export function EmailChangeForm({ account, onDirtyChange }: EmailChangeFormProps) {
    const queryClient = useQueryClient();
    const form = useForm<EmailChangeValues>({
        resolver: zodResolver(emailChangeSchema),
        defaultValues: EMPTY,
    });
    const { isDirty } = form.formState;
    const pending = account.pending_email;

    useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

    const refresh = () => queryClient.invalidateQueries({ queryKey: accountKeys.account });

    const request = useMutation({
        mutationFn: accountService.requestEmailChange,
        onSuccess: (sent) => {
            form.reset(EMPTY);
            void refresh();
            toast.success(`Tautan konfirmasi telah dikirim ke ${sent.email}.`);
        },
        onError: (error) => applyFormError(error, form.setError),
    });

    const cancel = useMutation({
        mutationFn: accountService.cancelEmailChange,
        onSuccess: () => {
            void refresh();
            toast.success('Perubahan email dibatalkan.');
        },
        onError: notifyError,
    });

    return (
        <FormCard
            isDirty={isDirty}
            onSubmit={form.handleSubmit((values) => request.mutate(values))}
            actions={
                <Button type="submit" disabled={!isDirty} loading={request.isPending}>
                    Kirim tautan konfirmasi
                </Button>
            }
        >
            <div className="grid gap-0.5">
                <h2 className="text-sm font-semibold">Email login</h2>
                <p className="text-xs text-muted-foreground">
                    Email saat ini:{' '}
                    <span className="break-all text-foreground">{account.email}</span>. Email baru
                    berlaku setelah Anda membuka tautan yang dikirim ke alamat baru, dan email saat
                    ini menerima pemberitahuan.
                </p>
            </div>
            {pending !== null && (
                <div
                    role="status"
                    className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center"
                >
                    <MailCheck
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                    />
                    <p className="min-w-0 flex-1">
                        Menunggu konfirmasi dari{' '}
                        <span className="break-all font-medium">{pending.email}</span>. Tautan
                        berlaku sampai {formatDateTime(pending.expires_at)}.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={cancel.isPending}
                        onClick={() => cancel.mutate()}
                    >
                        Batalkan perubahan
                    </Button>
                </div>
            )}
            <FormAlert message={form.formState.errors.root?.server?.message} />
            <FormField
                control={form.control}
                name="email"
                label="Email baru"
                type="email"
                autoComplete="email"
                maxLength={255}
                required
                description={
                    pending === null
                        ? undefined
                        : 'Permintaan baru menggantikan permintaan yang sedang menunggu.'
                }
            />
            <PasswordField
                control={form.control}
                name="current_password"
                label="Password akun"
                description="Untuk memastikan Anda pemilik akun ini."
                autoComplete="current-password"
                required
            />
        </FormCard>
    );
}
