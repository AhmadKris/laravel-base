import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { BackLink } from '@/components/shared/BackLink';
import { CenteredPage } from '@/components/shared/CenteredPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageSkeleton } from '@/components/shared/skeletons';
import { Card } from '@/components/ui/card';
import { ApiError, toApiError } from '@/lib/api-error';
import { UserForm } from '../components/UserForm';
import { userKeys, userService } from '../services/userService';

export function UserCreatePage() {
    return (
        <CenteredPage>
            <BackLink to="/users" label="Daftar pengguna" />
            <PageHeader
                title="Tambah pengguna"
                description="Buat akun pengguna dan tetapkan rolenya."
            />
            <UserForm />
        </CenteredPage>
    );
}

export function UserEditPage() {
    const { userId = '' } = useParams();

    const query = useQuery({
        queryKey: userKeys.detail(userId),
        queryFn: () => userService.get(userId),
    });

    if (query.isPending) {
        return (
            <CenteredPage>
                <PageSkeleton label="Memuat data pengguna" />
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
                            title="Data pengguna tidak dapat dimuat"
                            message={toApiError(query.error).message}
                            onRetry={() => void query.refetch()}
                        />
                    )}
                </Card>
            </CenteredPage>
        );
    }

    return (
        <CenteredPage>
            <BackLink to={`/users/${query.data.id}`} label={query.data.name} />
            <PageHeader title="Ubah pengguna" description={query.data.email} />
            <UserForm user={query.data} />
        </CenteredPage>
    );
}
