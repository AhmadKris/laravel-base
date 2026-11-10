import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBranding } from '@/hooks/useBranding';
import { toApiError } from '@/lib/api-error';
import { brandingKeys, brandingService } from '@/lib/branding';
import { notifyError } from '@/lib/notify';
import type { BrandingAsset } from '@/types/api-response';

interface AssetRule {
    asset: BrandingAsset;
    label: string;
    object: string;
    hint: string;
    extensions: string[];
    maxBytes: number;
    formatError: string;
    sizeError: string;
    /** The surface the file is shown on, so a light logo for dark backgrounds stays visible. */
    previewClassName: string;
}

// Mirrors the server rules so most mistakes show before uploading. The server also checks the content.
const ASSETS: AssetRule[] = [
    {
        asset: 'logo',
        label: 'Logo',
        object: 'logo perusahaan',
        hint: 'PNG, JPG, atau WebP sampai 2 MB. Ukurannya disesuaikan otomatis. PNG transparan menyatu dengan semua latar.',
        extensions: ['png', 'jpg', 'jpeg', 'webp'],
        maxBytes: 2 * 1024 * 1024,
        formatError: 'Logo harus berupa file PNG, JPG, atau WebP.',
        sizeError: 'Logo maksimal 2 MB.',
        previewClassName: 'bg-muted',
    },
    {
        asset: 'logo-dark',
        label: 'Logo latar gelap',
        object: 'logo untuk latar gelap',
        hint: 'Opsional, dipakai di mode gelap dan panel halaman masuk. Jika kosong, logo utama yang dipakai. Ukurannya disesuaikan otomatis.',
        extensions: ['png', 'jpg', 'jpeg', 'webp'],
        maxBytes: 2 * 1024 * 1024,
        formatError: 'Logo latar gelap harus berupa file PNG, JPG, atau WebP.',
        sizeError: 'Logo latar gelap maksimal 2 MB.',
        previewClassName: 'bg-brand text-brand-foreground',
    },
    {
        asset: 'favicon',
        label: 'Favicon',
        object: 'favicon',
        hint: 'PNG, JPG, WebP, atau ICO sampai 1 MB. Gambar yang tidak persegi diberi ruang kosong otomatis.',
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'ico'],
        maxBytes: 1024 * 1024,
        formatError: 'Favicon harus berupa file PNG, JPG, WebP, atau ICO.',
        sizeError: 'Favicon maksimal 1 MB.',
        previewClassName: 'bg-muted',
    },
];

function checkFile(rule: AssetRule, file: File): string | undefined {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!rule.extensions.includes(extension)) {
        return rule.formatError;
    }

    return file.size > rule.maxBytes ? rule.sizeError : undefined;
}

interface BrandingSectionProps {
    canUpdate: boolean;
    /** Reports a chosen file that is not saved yet. */
    onDirtyChange: (key: string, dirty: boolean) => void;
}

export function BrandingSection({ canUpdate, onDirtyChange }: BrandingSectionProps) {
    const { logoUrl, logoDarkUrl, faviconUrl } = useBranding();
    const urls: Record<BrandingAsset, string | undefined> = {
        logo: logoUrl,
        'logo-dark': logoDarkUrl,
        favicon: faviconUrl,
    };

    return (
        <Card className="gap-4 px-5 py-5">
            <div className="grid gap-0.5">
                <h2 className="text-sm font-semibold">Logo dan favicon</h2>
                <p className="text-xs text-muted-foreground">
                    Tampil di sidebar, halaman masuk, dan tab browser.
                </p>
            </div>
            <div className="grid gap-5">
                {ASSETS.map((rule) => (
                    <BrandingField
                        key={rule.asset}
                        rule={rule}
                        currentUrl={urls[rule.asset]}
                        canUpdate={canUpdate}
                        onDirtyChange={(dirty) => onDirtyChange(`branding:${rule.asset}`, dirty)}
                    />
                ))}
            </div>
        </Card>
    );
}

interface BrandingFieldProps {
    rule: AssetRule;
    currentUrl: string | undefined;
    canUpdate: boolean;
    onDirtyChange: (dirty: boolean) => void;
}

function BrandingField({ rule, currentUrl, canUpdate, onDirtyChange }: BrandingFieldProps) {
    const queryClient = useQueryClient();
    const inputRef = useRef<HTMLInputElement>(null);
    const id = useId();
    const [selection, setSelection] = useState<{ file: File; previewUrl: string } | null>(null);

    useEffect(() => onDirtyChange(selection !== null), [selection, onDirtyChange]);
    const [error, setError] = useState<string | undefined>(undefined);
    const [isRemoving, setIsRemoving] = useState(false);
    const selected = selection?.file ?? null;
    const previewUrl = selection?.previewUrl;

    // Frees the preview of a file that was replaced, cleared, or left behind on unmount.
    useEffect(() => {
        if (previewUrl === undefined) {
            return;
        }

        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const clearSelection = () => {
        setSelection(null);
        setError(undefined);

        if (inputRef.current !== null) {
            inputRef.current.value = '';
        }
    };

    const upload = useMutation({
        mutationFn: (file: File) => brandingService.upload(rule.asset, file),
        onSuccess: () => {
            clearSelection();
            void queryClient.invalidateQueries({ queryKey: brandingKeys.all });
            toast.success(`${rule.label} telah disimpan.`);
        },
        onError: (uploadError) => {
            const apiError = toApiError(uploadError);
            setError(apiError.fieldErrors.file?.[0] ?? apiError.message);
        },
    });

    const remove = useMutation({
        mutationFn: () => brandingService.remove(rule.asset),
        onSuccess: () => {
            setIsRemoving(false);
            void queryClient.invalidateQueries({ queryKey: brandingKeys.all });
            toast.success(`${rule.label} telah dihapus.`);
        },
        onError: notifyError,
    });

    const shownUrl = previewUrl ?? currentUrl;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div
                className={cn(
                    'flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border',
                    rule.previewClassName,
                )}
            >
                {shownUrl === undefined ? (
                    <span className="px-1 text-center text-xs text-muted-foreground">Bawaan</span>
                ) : (
                    <img
                        src={shownUrl}
                        alt={
                            previewUrl === undefined
                                ? `${rule.label} saat ini`
                                : `Pratinjau ${rule.label.toLowerCase()}`
                        }
                        className="size-full object-contain"
                    />
                )}
            </div>
            <div className="grid min-w-0 flex-1 gap-1.5">
                <label htmlFor={id} className="text-sm font-medium">
                    {rule.label}
                </label>
                <p id={hintId} className="text-xs text-muted-foreground">
                    {rule.hint}
                </p>
                {selected !== null && (
                    <p className="truncate text-xs">File dipilih: {selected.name}</p>
                )}
                {error !== undefined && (
                    <p id={errorId} className="text-xs text-destructive">
                        {error}
                    </p>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept={rule.extensions.map((extension) => `.${extension}`).join(',')}
                    className="sr-only"
                    tabIndex={-1}
                    disabled={!canUpdate || upload.isPending}
                    aria-invalid={error !== undefined}
                    aria-describedby={error === undefined ? hintId : `${errorId} ${hintId}`}
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file === undefined) {
                            return;
                        }

                        upload.reset();
                        setSelection({ file, previewUrl: URL.createObjectURL(file) });
                        setError(checkFile(rule, file));
                    }}
                />
                {canUpdate && (
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                        {selected === null ? (
                            <>
                                {currentUrl !== undefined && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsRemoving(true)}
                                    >
                                        Hapus {rule.label.toLowerCase()}
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => inputRef.current?.click()}
                                >
                                    {currentUrl === undefined ? 'Pilih file' : 'Ganti file'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={upload.isPending}
                                    onClick={clearSelection}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    disabled={checkFile(rule, selected) !== undefined}
                                    loading={upload.isPending}
                                    onClick={() => upload.mutate(selected)}
                                >
                                    Simpan {rule.label.toLowerCase()}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
            <ConfirmDialog
                open={isRemoving}
                onOpenChange={setIsRemoving}
                title={`Hapus ${rule.object}?`}
                description={`${rule.label} yang diunggah akan dihapus dan aplikasi kembali memakai tampilan bawaan.`}
                confirmLabel={`Hapus ${rule.label.toLowerCase()}`}
                isPending={remove.isPending}
                onConfirm={() => remove.mutate()}
            />
        </div>
    );
}
