import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/types/api-response';
import { dashboardService } from '../services/dashboardService';

const UNKNOWN_ACTOR = 'Akun tidak dikenal';
const UNKNOWN_EVENT = 'melakukan perubahan';

const EVENT_LABELS: Record<string, string> = {
    'auth.login': 'masuk ke aplikasi',
    'auth.login_failed': 'gagal masuk',
    'auth.logout': 'keluar dari aplikasi',
    'auth.password_changed': 'mengubah password',
    'auth.password_reset': 'mereset password',
    'permission.assigned': 'memberikan permission',
    'permission.revoked': 'mencabut permission',
    'role.created': 'membuat role',
    'role.updated': 'memperbarui role',
    'role.deleted': 'menghapus role',
    'system.configuration_updated': 'memperbarui pengaturan sistem',
    'user.created': 'menambahkan pengguna',
    'user.updated': 'memperbarui data pengguna',
    'user.deactivated': 'menonaktifkan pengguna',
    'user.role_assigned': 'memberikan role kepada pengguna',
    'user.role_removed': 'mencabut role pengguna',
};

function ActivityRow({ activity }: { activity: AuditLog }) {
    const actorName = activity.actor?.name ?? UNKNOWN_ACTOR;

    return (
        <li className="flex items-center gap-3">
            <UserAvatar name={actorName} />
            <div className="flex min-w-0 flex-col">
                <span className="text-sm">
                    <span className="font-medium">{actorName}</span>{' '}
                    {EVENT_LABELS[activity.event ?? ''] ?? UNKNOWN_EVENT}
                </span>
                {activity.created_at !== null && (
                    <span className="text-xs text-muted-foreground">
                        {formatDateTime(activity.created_at)}
                    </span>
                )}
            </div>
        </li>
    );
}

export function RecentActivity() {
    const activity = useQuery({
        queryKey: ['dashboard', 'recent-activity'],
        queryFn: dashboardService.getRecentActivity,
    });

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-sm font-semibold">Aktivitas terbaru</CardTitle>
            </CardHeader>
            <CardContent>
                {activity.isPending && <ListSkeleton label="Memuat aktivitas terbaru" />}
                {activity.isError && (
                    <ErrorState
                        title="Aktivitas terbaru belum dapat dimuat"
                        message={toApiError(activity.error).message}
                        onRetry={() => void activity.refetch()}
                    />
                )}
                {activity.isSuccess && activity.data.length === 0 && (
                    <EmptyState title="Belum ada aktivitas yang tercatat" />
                )}
                {activity.isSuccess && activity.data.length > 0 && (
                    <ul className="flex flex-col gap-4">
                        {activity.data.map((item) => (
                            <ActivityRow key={item.id} activity={item} />
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
