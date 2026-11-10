import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BackLink } from '@/components/shared/BackLink';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { DetailCard } from '@/components/shared/DetailCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { ApiError, toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import { DeleteRoleDialog } from '../components/DeleteRoleDialog';
import { groupPermissions, SUPER_ADMIN_ROLE } from '../permissionGroups';
import { roleKeys, roleService } from '../services/roleService';

export function RoleDetailPage() {
    const { roleId = '' } = useParams();
    const { can } = usePermission();
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);

    const query = useQuery({
        queryKey: roleKeys.detail(roleId),
        queryFn: () => roleService.get(roleId),
    });

    if (query.isPending) {
        return (
            <CenteredPage>
                <PageSkeleton label="Memuat detail role" />
            </CenteredPage>
        );
    }

    if (query.isError) {
        return (
            <CenteredPage>
                <BackLink to="/roles" label="Daftar role" />
                <Card className="py-0">
                    {query.error instanceof ApiError && query.error.status === 404 ? (
                        <EmptyState
                            title="Role tidak ditemukan"
                            description="Role ini sudah dihapus."
                            action={
                                <Button asChild variant="outline" size="sm">
                                    <Link to="/roles">Kembali ke daftar role</Link>
                                </Button>
                            }
                        />
                    ) : (
                        <ErrorState
                            title="Detail role tidak dapat dimuat"
                            message={toApiError(query.error).message}
                            onRetry={() => void query.refetch()}
                        />
                    )}
                </Card>
            </CenteredPage>
        );
    }

    const role = query.data;
    const permissions = role.permissions ?? [];
    const groups = groupPermissions(permissions);

    return (
        <CenteredPage>
            <BackLink to="/roles" label="Daftar role" />
            <PageHeader
                title={role.name}
                description={role.is_protected ? 'Role bawaan' : 'Role kustom'}
                actions={
                    <>
                        {can('role.update') && role.name !== SUPER_ADMIN_ROLE && (
                            <Button asChild variant="outline">
                                <Link to={`/roles/${role.id}/edit`}>Ubah role</Link>
                            </Button>
                        )}
                        {can('role.delete') && !role.is_protected && (
                            <Button variant="destructive" onClick={() => setIsDeleting(true)}>
                                Hapus role
                            </Button>
                        )}
                    </>
                }
            />
            <DetailCard title="Ringkasan role">
                <dl className="grid gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">Jenis</dt>
                    <dd>
                        <Badge variant={role.is_protected ? 'info' : 'secondary'}>
                            {role.is_protected ? 'Bawaan' : 'Kustom'}
                        </Badge>
                    </dd>
                    <dt className="text-muted-foreground">Jumlah pengguna</dt>
                    <dd className="tabular-nums">{role.users_count ?? 0}</dd>
                    <dt className="text-muted-foreground">Total permission</dt>
                    <dd className="tabular-nums">{permissions.length}</dd>
                    <dt className="text-muted-foreground">Dibuat</dt>
                    <dd className="tabular-nums">
                        {role.created_at ? formatDateTime(role.created_at) : '-'}
                    </dd>
                </dl>
            </DetailCard>
            <DetailCard title="Permission">
                <div className="flex flex-col gap-3">
                    {groups.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Role ini belum memiliki permission.
                        </p>
                    )}
                    {groups.map((group) => (
                        <div key={group.label} className="grid gap-1.5">
                            <p className="text-xs font-medium text-muted-foreground">
                                {group.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {group.permissions.map((name) => (
                                    <Badge key={name} variant="secondary">
                                        {name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DetailCard>
            <DeleteRoleDialog
                role={isDeleting ? role : null}
                onClose={() => setIsDeleting(false)}
                onDeleted={() => void navigate('/roles', { replace: true })}
            />
        </CenteredPage>
    );
}
