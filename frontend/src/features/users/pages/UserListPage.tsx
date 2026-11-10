import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DataTable } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { SearchInput } from '@/components/shared/SearchInput';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/usePermission';
import { useLastPageCorrection, useTableParams } from '@/hooks/useTableParams';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/api-response';
import { userColumns } from '../components/userColumns';
import { UserStatusDialog } from '../components/UserStatusDialog';
import { userKeys, userService } from '../services/userService';

const ALL_STATUSES = 'all';
export function UserListPage() {
    const {
        params,
        filters: tableFilters,
        searchInput,
        changeSearch,
        updateParams,
        tableProps,
    } = useTableParams();
    const { can } = usePermission();
    const navigate = useNavigate();
    const currentUserId = useAuthStore((state) => state.user?.id);
    const [statusTarget, setStatusTarget] = useState<User | null>(null);
    const filters = { ...tableFilters, status: params.get('status') ?? undefined };

    const users = useQuery({
        queryKey: userKeys.list(filters),
        queryFn: () => userService.list(filters),
        placeholderData: keepPreviousData,
    });

    const pagination = users.data?.meta.pagination;
    useLastPageCorrection(
        filters.page,
        users.data?.data.length === 0,
        pagination?.last_page ?? 1,
        users.isPlaceholderData,
        updateParams,
    );

    const canUpdate = can('user.update');
    const canDelete = can('user.delete');
    const columns = useMemo(
        () => userColumns({ currentUserId, canUpdate, canDelete, onChangeStatus: setStatusTarget }),
        [currentUserId, canUpdate, canDelete],
    );

    const hasFilters = filters.search !== undefined || filters.status !== undefined;

    const clearFilters = () => {
        updateParams({ search: undefined, status: undefined, page: undefined });
    };

    return (
        <section className="flex flex-col gap-4">
            <PageHeader
                title="Pengguna"
                description="Kelola akun, role, dan status pengguna."
                actions={
                    can('user.create') && (
                        <Button asChild>
                            <Link to="/users/new">
                                <Plus aria-hidden="true" />
                                Tambah pengguna
                            </Link>
                        </Button>
                    )
                }
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                    label="Cari nama atau email pengguna"
                    placeholder="Cari nama atau email"
                    value={searchInput}
                    onChange={changeSearch}
                />
                <FilterBar activeCount={filters.status === undefined ? 0 : 1}>
                    <Select
                        value={filters.status ?? ALL_STATUSES}
                        onValueChange={(value) =>
                            updateParams({
                                status: value === ALL_STATUSES ? undefined : value,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger aria-label="Filter status" className="w-full sm:w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_STATUSES}>Semua status</SelectItem>
                            <SelectItem value="active">Aktif</SelectItem>
                            <SelectItem value="inactive">Nonaktif</SelectItem>
                        </SelectContent>
                    </Select>
                    {hasFilters && (
                        <Button type="button" variant="ghost" onClick={clearFilters}>
                            Hapus filter
                        </Button>
                    )}
                </FilterBar>
            </div>
            <DataTable
                {...tableProps}
                columns={columns}
                rows={users.data?.data}
                getRowId={(user) => user.id}
                isLoading={users.isPending}
                error={users.error}
                onRetry={() => void users.refetch()}
                loadingLabel="Memuat daftar pengguna"
                errorTitle="Daftar pengguna tidak dapat dimuat"
                emptyTitle={hasFilters ? 'Tidak ada pengguna yang cocok' : 'Belum ada pengguna'}
                emptyDescription={
                    hasFilters
                        ? 'Ubah kata kunci atau filter status.'
                        : 'Pengguna yang ditambahkan akan tampil di sini.'
                }
                emptyAction={
                    hasFilters ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                            Reset filter
                        </Button>
                    ) : can('user.create') ? (
                        <Button asChild size="sm">
                            <Link to="/users/new">
                                <Plus aria-hidden="true" />
                                Tambah pengguna
                            </Link>
                        </Button>
                    ) : undefined
                }
                pagination={pagination}
                onRowClick={(user) => void navigate(`/users/${user.id}`)}
            />
            <UserStatusDialog user={statusTarget} onClose={() => setStatusTarget(null)} />
        </section>
    );
}
