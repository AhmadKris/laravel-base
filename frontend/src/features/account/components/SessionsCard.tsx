import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toApiError, toApiErrorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import type { ActiveSession } from '@/types/api-response';
import { accountKeys, accountService } from '../services/accountService';
import { describeUserAgent } from '../userAgent';

export function SessionsCard() {
    const queryClient = useQueryClient();
    const [target, setTarget] = useState<ActiveSession | 'others' | null>(null);
    const query = useQuery({ queryKey: accountKeys.sessions, queryFn: accountService.sessions });

    const revoke = useMutation({
        mutationFn: async (selected: ActiveSession | 'others'): Promise<void> => {
            if (selected === 'others') {
                await accountService.revokeOtherSessions();
            } else {
                await accountService.revokeSession(selected.id);
            }
        },
        onSuccess: (_, selected) => {
            setTarget(null);
            void queryClient.invalidateQueries({ queryKey: accountKeys.sessions });
            toast.success(
                selected === 'others'
                    ? 'Semua sesi di perangkat lain telah diakhiri.'
                    : `Sesi ${describeUserAgent(selected.user_agent)} telah diakhiri.`,
            );
        },
    });

    const others = query.data?.filter((session) => !session.is_current) ?? [];

    return (
        <Card className="gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-0.5">
                    <h2 className="text-sm font-semibold">Sesi aktif</h2>
                    <p className="text-xs text-muted-foreground">
                        Perangkat yang sedang masuk ke akun Anda. Akhiri sesi yang tidak Anda
                        kenali, lalu ganti password.
                    </p>
                </div>
                {others.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setTarget('others')}>
                        Keluar dari semua perangkat lain
                    </Button>
                )}
            </div>
            {query.isPending && <ListSkeleton label="Memuat sesi aktif" rows={2} />}
            {query.isError && (
                <ErrorState
                    title="Sesi aktif tidak dapat dimuat"
                    message={toApiError(query.error).message}
                    onRetry={() => void query.refetch()}
                />
            )}
            {query.isSuccess && (
                <ul className="divide-y">
                    {query.data.map((session) => {
                        const device = describeUserAgent(session.user_agent);

                        return (
                            <li key={session.id} className="flex items-center gap-3 py-3">
                                <Monitor
                                    aria-hidden="true"
                                    className="size-4 shrink-0 text-muted-foreground"
                                />
                                <div className="grid min-w-0 flex-1 gap-0.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className="text-sm font-medium"
                                            title={session.user_agent ?? undefined}
                                        >
                                            {device}
                                        </span>
                                        {session.is_current && (
                                            <Badge variant="secondary">Perangkat ini</Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {session.ip_address ?? 'IP tidak diketahui'}, aktif{' '}
                                        {formatDateTime(session.last_active_at)}
                                    </span>
                                </div>
                                {!session.is_current && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Akhiri sesi ${device}, ${session.ip_address ?? 'IP tidak diketahui'}`}
                                        onClick={() => setTarget(session)}
                                    >
                                        Akhiri sesi
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {query.isSuccess && others.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    Tidak ada sesi lain. Akun Anda hanya masuk di perangkat ini.
                </p>
            )}
            <ConfirmDialog
                open={target !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        revoke.reset();
                        setTarget(null);
                    }
                }}
                title={
                    target === 'others'
                        ? 'Keluar dari semua perangkat lain?'
                        : `Akhiri sesi ${target === null ? '' : describeUserAgent(target.user_agent)}?`
                }
                description={
                    target === 'others'
                        ? `${others.length} sesi lain akan diakhiri dan perangkat tersebut harus masuk kembali. Sesi di perangkat ini tetap berjalan.`
                        : 'Perangkat tersebut harus masuk kembali untuk memakai akun Anda.'
                }
                confirmLabel={target === 'others' ? 'Keluar dari perangkat lain' : 'Akhiri sesi'}
                error={revoke.error ? toApiErrorMessage(revoke.error) : undefined}
                isPending={revoke.isPending}
                onConfirm={() => {
                    if (target !== null) {
                        revoke.mutate(target);
                    }
                }}
            />
        </Card>
    );
}
