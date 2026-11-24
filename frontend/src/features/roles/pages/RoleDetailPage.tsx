import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BackLink } from '@/components/shared/BackLink';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { DetailCard } from '@/components/shared/DetailCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListSkeleton, PageSkeleton } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { ApiError, toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import { DeleteRoleDialog } from '../components/DeleteRoleDialog';
import {
    DUPLICATE_ROLE_PERMISSIONS,
    groupPermissions,
    SUPER_ADMIN_ROLE,
} from '../permissionGroups';
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
    const hasPermissions = (query.data?.permissions ?? []).length > 0;
    // Labels come from the role's own endpoint, which needs only role.view.
    const permissionQuery = useQuery({
        queryKey: roleKeys.detailPermissions(roleId),
        queryFn: () => roleService.listRolePermissions(roleId),
        enabled: hasPermissions,
    });

    if (query.isPending) {
        return (
            <CenteredPage width="wide">
                <PageSkeleton label="Memuat detail role" />
            </CenteredPage>
        );
    }

    if (query.isError) {
        return (
            <CenteredPage width="wide">
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
    const usersCount = role.users_count ?? 0;

    return (
        <CenteredPage width="wide">
            <BackLink to="/roles" label="Daftar role" />
            <PageHeader
                title={role.name}
                description={role.is_protected ? 'Role bawaan' : 'Role kustom'}
                actions={
                    <>
                        {DUPLICATE_ROLE_PERMISSIONS.every(can) &&
                            role.name !== SUPER_ADMIN_ROLE && (
                                <Button asChild variant="outline">
                                    <Link to={`/roles/new?copy=${role.id}`}>Duplikat role</Link>
                                </Button>
                            )}
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
                <dl className="grid gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
                    <dt className="text-muted-foreground">Deskripsi</dt>
                    <dd className="whitespace-pre-line">{role.description ?? '-'}</dd>
                    <dt className="text-muted-foreground">Jenis</dt>
                    <dd>
                        <Badge variant={role.is_protected ? 'info' : 'secondary'}>
                            {role.is_protected ? 'Bawaan' : 'Kustom'}
                        </Badge>
                    </dd>
                    <dt className="text-muted-foreground">Jumlah pengguna</dt>
                    <dd className="tabular-nums">
                        {usersCount > 0 && can('user.view') ? (
                            <Link
                                to={`/users?role=${encodeURIComponent(role.name)}`}
                                className="text-primary hover:underline"
                            >
                                {usersCount} pengguna
                            </Link>
                        ) : (
                            <span>{usersCount}</span>
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Total hak akses</dt>
                    <dd className="tabular-nums">{permissions.length} izin</dd>
                    <dt className="text-muted-foreground">Dibuat</dt>
                    <dd className="tabular-nums">
                        {role.created_at ? formatDateTime(role.created_at) : '-'}
                    </dd>
                </dl>
            </DetailCard>
            <DetailCard title="Hak akses">
                {!hasPermissions ? (
                    <p className="text-sm text-muted-foreground">
                        Role ini belum memiliki permission.
                    </p>
                ) : permissionQuery.isPending ? (
                    <ListSkeleton label="Memuat hak akses" rows={3} />
                ) : permissionQuery.isError ? (
                    <ErrorState
                        title="Hak akses tidak dapat dimuat"
                        message={toApiError(permissionQuery.error).message}
                        onRetry={() => void permissionQuery.refetch()}
                    />
                ) : (
                    <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
                        {groupPermissions(permissionQuery.data).map((group) => (
                            <div key={group.key} className="contents">
                                <dt className="font-medium">{group.label}</dt>
                                <dd className="flex flex-wrap gap-1.5">
                                    {group.permissions.map((permission) => (
                                        <Badge
                                            key={permission.name}
                                            variant="secondary"
                                            title={permission.name}
                                        >
                                            {permission.label}
                                        </Badge>
                                    ))}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </DetailCard>
            <DeleteRoleDialog
                role={isDeleting ? role : null}
                onClose={() => setIsDeleting(false)}
                onDeleted={() => void navigate('/roles', { replace: true })}
            />
        </CenteredPage>
    );
}
