import { useMutation } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { toApiError, toApiErrorMessage } from '@/lib/api-error';
import { ownAvatarUrl } from '@/lib/avatar';
import type { Account } from '@/types/api-response';
import { accountService } from '../services/accountService';
import { useSyncAuthUser } from '../hooks/useSyncAuthUser';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

function checkPhoto(file: File): string | undefined {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return 'Foto harus berupa file PNG, JPG, atau WebP.';
    }

    return file.size > MAX_BYTES ? 'Foto maksimal 2 MB.' : undefined;
}

export function AvatarField({ account }: { account: Account }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const id = useId();
    const [error, setError] = useState<string | undefined>(undefined);
    const [isRemoving, setIsRemoving] = useState(false);
    const syncAuthUser = useSyncAuthUser();

    const upload = useMutation({
        mutationFn: accountService.uploadAvatar,
        onSuccess: (saved) => {
            syncAuthUser(saved);
            toast.success('Foto profil telah diganti.');
        },
        onError: (uploadError) => {
            const apiError = toApiError(uploadError);
            setError(apiError.fieldErrors.file?.[0] ?? apiError.message);
        },
    });

    const remove = useMutation({
        mutationFn: accountService.removeAvatar,
        onSuccess: (saved) => {
            setIsRemoving(false);
            syncAuthUser(saved);
            toast.success('Foto profil telah dihapus.');
        },
    });

    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
        <div className="flex items-center gap-4">
            <UserAvatar
                name={account.name}
                src={ownAvatarUrl(account.avatar)}
                className="size-16"
            />
            <div className="grid min-w-0 gap-1.5">
                <label htmlFor={id} className="text-sm font-medium">
                    Foto profil
                </label>
                <p id={hintId} className="text-xs text-muted-foreground">
                    PNG, JPG, atau WebP sampai 2 MB. Foto dipotong menjadi persegi di bagian tengah.
                </p>
                {error !== undefined && (
                    <p id={errorId} className="text-xs text-destructive">
                        {error}
                    </p>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    tabIndex={-1}
                    disabled={upload.isPending}
                    aria-invalid={error !== undefined}
                    aria-describedby={error === undefined ? hintId : `${errorId} ${hintId}`}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';

                        if (file === undefined) {
                            return;
                        }

                        const problem = checkPhoto(file);
                        setError(problem);

                        if (problem === undefined) {
                            upload.mutate(file);
                        }
                    }}
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={upload.isPending}
                        onClick={() => inputRef.current?.click()}
                    >
                        {account.avatar === null ? 'Unggah foto' : 'Ganti foto'}
                    </Button>
                    {account.avatar !== null && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={upload.isPending}
                            onClick={() => setIsRemoving(true)}
                        >
                            Hapus foto
                        </Button>
                    )}
                </div>
            </div>
            <ConfirmDialog
                open={isRemoving}
                onOpenChange={(open) => {
                    if (!open) {
                        remove.reset();
                    }
                    setIsRemoving(open);
                }}
                title="Hapus foto profil?"
                description="Foto profil Anda dihapus dan inisial nama ditampilkan sebagai gantinya."
                confirmLabel="Hapus foto"
                error={remove.error ? toApiErrorMessage(remove.error) : undefined}
                isPending={remove.isPending}
                onConfirm={() => remove.mutate()}
            />
        </div>
    );
}
