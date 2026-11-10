import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { BackLink } from '@/components/shared/BackLink';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError, toApiError } from '@/lib/api-error';
import { RoleForm } from '../components/RoleForm';
import { SUPER_ADMIN_ROLE } from '../permissionGroups';
import { roleKeys, roleService } from '../services/roleService';

export function RoleCreatePage() {
    return (
        <CenteredPage>
            <BackLink to="/roles" label="Daftar role" />
            <PageHeader title="Tambah role" description="Tentukan nama dan permission role." />
            <RoleForm />
        </CenteredPage>
    );
}

export function RoleEditPage() {
    const { roleId = '' } = useParams();

    const query = useQuery({
        queryKey: roleKeys.detail(roleId),
        queryFn: () => roleService.get(roleId),
    });

    if (query.isPending) {
        return (
            <CenteredPage>
                <PageSkeleton label="Memuat data role" />
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
                            title="Data role tidak dapat dimuat"
                            message={toApiError(query.error).message}
                            onRetry={() => void query.refetch()}
                        />
                    )}
                </Card>
            </CenteredPage>
        );
    }

    const role = query.data;

    return (
        <CenteredPage>
            <BackLink to={`/roles/${role.id}`} label={role.name} />
            <PageHeader title="Ubah role" description={role.name} />
            {role.name === SUPER_ADMIN_ROLE ? (
                <Card className="py-0">
                    <EmptyState
                        title="Role ini tidak dapat diubah"
                        description="Super Admin selalu memiliki seluruh permission."
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/roles">Kembali ke daftar role</Link>
                            </Button>
                        }
                    />
                </Card>
            ) : (
                // The version changes after a reload, which refills the form with the latest data.
                <RoleForm key={role.version} role={role} />
            )}
        </CenteredPage>
    );
}
