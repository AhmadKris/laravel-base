import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toApiError } from '@/lib/api-error';
import { describeEvent } from '@/lib/audit-events';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/types/api-response';
import { dashboardService } from '../services/dashboardService';

const UNKNOWN_ACTOR = 'Akun tidak dikenal';

function ActivityRow({ activity }: { activity: AuditLog }) {
    const actorName = activity.actor?.name ?? UNKNOWN_ACTOR;

    return (
        <li>
            <Link
                to={`/audit-logs/${activity.id}`}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <UserAvatar name={actorName} />
                <div className="flex min-w-0 flex-col">
                    <span className="text-sm">
                        <span className="font-medium">{actorName}</span>{' '}
                        {describeEvent(activity.event_label)}
                    </span>
                    {activity.created_at !== null && (
                        <span className="text-xs text-muted-foreground">
                            {formatDateTime(activity.created_at)}
                        </span>
                    )}
                </div>
            </Link>
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
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm font-semibold">Aktivitas terbaru</CardTitle>
                <Link to="/audit-logs" className="text-xs font-medium text-primary hover:underline">
                    Lihat semua
                </Link>
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
                    <ul className="flex flex-col gap-1.5">
                        {activity.data.map((item) => (
                            <ActivityRow key={item.id} activity={item} />
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
