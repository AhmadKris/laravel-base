import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { BackLink } from '@/components/shared/BackLink';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { CopyButton } from '@/components/shared/CopyButton';
import { DetailCard } from '@/components/shared/DetailCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
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

    const canViewRoles = can('role.view');
    const rolesCount = query.data?.roles?.length ?? 0;
    const roleOptions = useQuery({
        queryKey: userKeys.roleOptions,
        queryFn: userService.listRoleOptions,
        enabled: canViewRoles && rolesCount > 0,
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
                            action={
                                <Button asChild variant="outline" size="sm">
                                    <Link to="/users">Kembali ke daftar pengguna</Link>
                                </Button>
                            }
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
    const roles = user.roles ?? [];

    return (
        <CenteredPage>
            <BackLink to="/users" label="Daftar pengguna" />
            <PageHeader
                leading={<UserAvatar name={user.name} size="lg" />}
                title={user.name}
                description={user.email}
                descriptionAction={<CopyButton value={user.email} label="Salin email" />}
                actions={
                    <>
                        {can('audit.view') && (
                            <Button asChild variant="ghost">
                                <Link to={`/audit-logs?user_id=${user.id}&period=all`}>
                                    Lihat aktivitas
                                </Link>
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
            <DetailCard title="Informasi akun">
                <dl className="grid gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                        <StatusBadge status={user.status} />
                    </dd>
                    <dt className="text-muted-foreground">Username</dt>
                    <dd className="min-w-0">
                        {user.username ? (
                            <div className="flex items-center gap-1.5">
                                <span className="min-w-0 break-all">{user.username}</span>
                                <CopyButton value={user.username} label="Salin username" />
                            </div>
                        ) : (
                            NOT_SET
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd className="min-w-0">
                        {roles.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {roles.map((roleName) => {
                                    if (!canViewRoles) {
                                        return (
                                            <Badge key={roleName} variant="secondary">
                                                {roleName}
                                            </Badge>
                                        );
                                    }

                                    const matchedRole = roleOptions.data?.find(
                                        (option) => option.name === roleName,
                                    );
                                    const target = matchedRole
                                        ? `/roles/${matchedRole.id}`
                                        : `/roles?search=${encodeURIComponent(roleName)}`;

                                    return (
                                        <Badge key={roleName} asChild variant="secondary">
                                            <Link to={target} className="hover:underline">
                                                {roleName}
                                            </Link>
                                        </Badge>
                                    );
                                })}
                            </div>
                        ) : (
                            NOT_SET
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Dibuat</dt>
                    <dd className="tabular-nums">
                        {user.created_at ? formatDateTime(user.created_at) : NOT_SET}
                    </dd>
                </dl>
            </DetailCard>
            <UserStatusDialog user={statusTarget} onClose={() => setStatusTarget(null)} />
        </CenteredPage>
    );
}
