import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { BackLink } from '@/components/shared/BackLink';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { CopyButton } from '@/components/shared/CopyButton';
import { DetailCard } from '@/components/shared/DetailCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { ApiError, toApiError } from '@/lib/api-error';
import { eventTitle, subjectTypeLabel } from '@/lib/audit-events';
import { formatDateTime } from '@/lib/format';
import type { AuditLog, JsonValue } from '@/types/api-response';
import { auditLogKeys, auditLogService } from '../services/auditLogService';

const CONTEXT_LABELS: Record<string, string> = {
    ip_address: 'Alamat IP',
    user_agent: 'Perangkat',
    request_id: 'ID permintaan',
};

function subjectPath(subject: NonNullable<AuditLog['subject']>): string | undefined {
    if (subject.id === null) {
        return undefined;
    }

    return {
        user: `/users/${subject.id}`,
        role: `/roles/${subject.id}`,
        system_configuration: '/settings',
    }[subject.type];
}

const SUBJECT_PERMISSIONS: Record<string, string> = {
    user: 'user.view',
    role: 'role.view',
    system_configuration: 'system_config.view',
};

function ValueView({ value }: { value: JsonValue }) {
    if (value === null || value === '') {
        return <span className="text-muted-foreground">-</span>;
    }

    if (typeof value === 'object') {
        return (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {JSON.stringify(value, null, 2)}
            </pre>
        );
    }

    return <span className="break-words">{String(value)}</span>;
}

function DetailList({ entries }: { entries: [string, JsonValue][] }) {
    return (
        <dl className="grid gap-3 text-sm sm:grid-cols-[9rem_1fr]">
            {entries.map(([key, value]) => (
                <div key={key} className="contents">
                    <dt className="font-mono text-xs text-muted-foreground sm:pt-0.5">{key}</dt>
                    <dd className="min-w-0">
                        <ValueView value={value} />
                    </dd>
                </div>
            ))}
        </dl>
    );
}

export function AuditLogDetailPage() {
    const { auditLogId = '' } = useParams();
    const { can } = usePermission();

    const query = useQuery({
        queryKey: auditLogKeys.detail(auditLogId),
        queryFn: () => auditLogService.get(auditLogId),
    });

    if (query.isPending) {
        return (
            <CenteredPage>
                <PageSkeleton label="Memuat detail aktivitas" />
            </CenteredPage>
        );
    }

    if (query.isError) {
        return (
            <CenteredPage>
                <BackLink to="/audit-logs" label="Daftar audit log" />
                <Card className="py-0">
                    {query.error instanceof ApiError && query.error.status === 404 ? (
                        <EmptyState
                            title="Aktivitas tidak ditemukan"
                            description="Aktivitas ini tidak ada atau berada di luar akses Anda."
                            action={
                                <Button asChild variant="outline" size="sm">
                                    <Link to="/audit-logs">Kembali ke audit log</Link>
                                </Button>
                            }
                        />
                    ) : (
                        <ErrorState
                            title="Detail aktivitas tidak dapat dimuat"
                            message={toApiError(query.error).message}
                            onRetry={() => void query.refetch()}
                        />
                    )}
                </Card>
            </CenteredPage>
        );
    }

    const log = query.data;
    const { context, ...changes } = log.properties ?? {};
    const contextEntries =
        context !== null && typeof context === 'object' && !Array.isArray(context)
            ? Object.entries(context).filter(([, value]) => value !== null)
            : [];
    const changeEntries = Object.entries(changes);
    const subjectLink =
        log.subject !== null && can(SUBJECT_PERMISSIONS[log.subject.type] ?? '')
            ? subjectPath(log.subject)
            : undefined;

    return (
        <CenteredPage>
            <BackLink to="/audit-logs" label="Daftar audit log" />
            <PageHeader
                title={eventTitle(log.event_label)}
                description={log.created_at ? formatDateTime(log.created_at) : undefined}
            />
            <DetailCard title="Ringkasan aktivitas">
                <dl className="grid gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">Kode aktivitas</dt>
                    <dd className="flex items-center gap-1.5">
                        {log.event ? (
                            <>
                                <span className="font-mono text-xs leading-5">{log.event}</span>
                                <CopyButton value={log.event} label="Salin kode aktivitas" />
                            </>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Pengguna</dt>
                    <dd className="min-w-0">
                        {log.actor === null ? (
                            <span className="text-muted-foreground">Tanpa akun</span>
                        ) : (
                            <div className="grid gap-0.5">
                                {can('user.view') ? (
                                    <Link
                                        to={`/users/${log.actor.id}`}
                                        className="font-medium hover:underline"
                                    >
                                        {log.actor.name}
                                    </Link>
                                ) : (
                                    <span className="font-medium">{log.actor.name}</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {log.actor.email}
                                </span>
                                <Link
                                    to={`/audit-logs?user_id=${log.actor.id}&period=all`}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Lihat semua aktivitas pengguna ini
                                </Link>
                            </div>
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Objek</dt>
                    <dd className="min-w-0">
                        {log.subject === null ? (
                            <span className="text-muted-foreground">-</span>
                        ) : (
                            <div className="grid gap-0.5">
                                {subjectLink === undefined ? (
                                    <span className="font-medium">
                                        {log.subject.label ?? 'Sudah dihapus'}
                                    </span>
                                ) : (
                                    <Link to={subjectLink} className="font-medium hover:underline">
                                        {log.subject.label ?? 'Sudah dihapus'}
                                    </Link>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {subjectTypeLabel(log.subject.type)}
                                </span>
                            </div>
                        )}
                    </dd>
                </dl>
            </DetailCard>
            <DetailCard title="Detail perubahan">
                {changeEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Aktivitas ini tidak mencatat data tambahan.
                    </p>
                ) : (
                    <DetailList entries={changeEntries} />
                )}
            </DetailCard>
            {contextEntries.length > 0 && (
                <DetailCard title="Asal permintaan">
                    <dl className="grid gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
                        {contextEntries.map(([key, value]) => {
                            const text = String(value);
                            const label = CONTEXT_LABELS[key] ?? key;

                            return (
                                <div key={key} className="contents">
                                    <dt className="text-muted-foreground">{label}</dt>
                                    <dd className="min-w-0 break-words">
                                        {key === 'ip_address' || key === 'request_id' ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="min-w-0 break-all">{text}</span>
                                                <CopyButton
                                                    value={text}
                                                    label={`Salin ${label.toLowerCase()}`}
                                                />
                                            </div>
                                        ) : (
                                            text
                                        )}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </DetailCard>
            )}
        </CenteredPage>
    );
}
