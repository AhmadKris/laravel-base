import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { BackLink } from '@/components/shared/BackLink';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { ApiError, toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/api-response';
import { UserStatusDialog } from '../components/UserStatusDialog';
import { userKeys, userService } from '../services/userService';

const NOT_SET = '-';

export function UserDetailPage() {
    const { userId = '' } = useParams();
    const { can } = usePermission();
    const currentUserId = useAuthStore((state) => state.user?.id);
    const [statusTarget, setStatusTarget] = useState<User | null>(null);

    const query = useQuery({
        queryKey: userKeys.detail(userId),
        queryFn: () => userService.get(userId),
    });

    if (query.isPending) {
        return (
            <CenteredPage>
                <PageSkeleton label="Memuat detail pengguna" />
            </CenteredPage>
        );
    }

    if (query.isError) {
        return (
            <CenteredPage>
                <BackLink to="/users" label="Daftar pengguna" />
                <Card className="py-0">
                    {query.error instanceof ApiError && query.error.status === 404 ? (
                        <EmptyState
                            title="Pengguna tidak ditemukan"
                            description="Pengguna ini sudah dihapus atau berada di luar akses Anda."
                        />
                    ) : (
                        <ErrorState
                            title="Detail pengguna tidak dapat dimuat"
                            message={toApiError(query.error).message}
                            onRetry={() => void query.refetch()}
                        />
                    )}
                </Card>
            </CenteredPage>
        );
    }

    const user = query.data;
    const isActive = user.status === 'active';
    const canChangeStatus = isActive
        ? can('user.delete') && user.id !== currentUserId
        : can('user.update');

    return (
        <CenteredPage>
            <BackLink to="/users" label="Daftar pengguna" />
            <PageHeader
                title={user.name}
                description={user.email}
                actions={
                    <>
                        {can('audit.view') && (
                            <Button asChild variant="ghost">
                                <Link to={`/audit-logs?user_id=${user.id}`}>Lihat aktivitas</Link>
                            </Button>
                        )}
                        {can('user.update') && (
                            <Button asChild variant="outline">
                                <Link to={`/users/${user.id}/edit`}>Ubah pengguna</Link>
                            </Button>
                        )}
                        {canChangeStatus && (
                            <Button
                                variant={isActive ? 'destructive' : 'outline'}
                                onClick={() => setStatusTarget(user)}
                            >
                                {isActive ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'}
                            </Button>
                        )}
                    </>
                }
            />
            <Card className="px-5 py-5">
                <dl className="grid grid-cols-[9rem_1fr] gap-y-3 text-sm">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                        <StatusBadge status={user.status} />
                    </dd>
                    <dt className="text-muted-foreground">Username</dt>
                    <dd>{user.username ?? NOT_SET}</dd>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd>{user.roles?.join(', ') || NOT_SET}</dd>
                    <dt className="text-muted-foreground">Dibuat</dt>
                    <dd>{user.created_at ? formatDateTime(user.created_at) : NOT_SET}</dd>
                </dl>
            </Card>
            <UserStatusDialog user={statusTarget} onClose={() => setStatusTarget(null)} />
        </CenteredPage>
    );
}
