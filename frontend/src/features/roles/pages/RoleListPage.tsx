import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { useLastPageCorrection, useTableParams } from '@/hooks/useTableParams';
import type { Role } from '@/types/api-response';
import { DeleteRoleDialog } from '../components/DeleteRoleDialog';
import { roleColumns } from '../components/roleColumns';
import { roleKeys, roleService } from '../services/roleService';

export function RoleListPage() {
    const { filters, searchInput, changeSearch, updateParams, tableProps } = useTableParams();
    const { can } = usePermission();
    const navigate = useNavigate();
    const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

    const roles = useQuery({
        queryKey: roleKeys.list(filters),
        queryFn: () => roleService.list(filters),
        placeholderData: keepPreviousData,
    });

    const pagination = roles.data?.meta.pagination;

    useLastPageCorrection(
        filters.page,
        roles.data?.data.length === 0,
        pagination?.last_page ?? 1,
        roles.isPlaceholderData,
        updateParams,
    );

    const canUpdate = can('role.update');
    const canDelete = can('role.delete');
    const columns = useMemo(
        () => roleColumns({ canUpdate, canDelete, onDelete: setPendingDelete }),
        [canUpdate, canDelete],
    );

    const hasSearch = filters.search !== undefined;

    const clearSearch = () => {
        updateParams({ search: undefined, page: undefined });
    };

    return (
        <section className="flex flex-col gap-4">
            <PageHeader
                title="Role"
                description="Kelola role dan permission yang dimilikinya."
                actions={
                    can('role.create') && (
                        <Button asChild>
                            <Link to="/roles/new">
                                <Plus aria-hidden="true" />
                                Tambah role
                            </Link>
                        </Button>
                    )
                }
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                    label="Cari nama role"
                    placeholder="Cari nama role"
                    value={searchInput}
                    onChange={changeSearch}
                />
                {hasSearch && (
                    <Button type="button" variant="ghost" onClick={clearSearch}>
                        Hapus filter
                    </Button>
                )}
            </div>
            <DataTable
                {...tableProps}
                columns={columns}
                rows={roles.data?.data}
                getRowId={(role) => String(role.id)}
                isLoading={roles.isPending}
                error={roles.error}
                onRetry={() => void roles.refetch()}
                loadingLabel="Memuat daftar role"
                errorTitle="Daftar role tidak dapat dimuat"
                emptyTitle={hasSearch ? 'Tidak ada role yang cocok' : 'Belum ada role'}
                emptyDescription={
                    hasSearch
                        ? 'Ubah kata kunci pencarian.'
                        : 'Role yang ditambahkan tampil di sini.'
                }
                emptyAction={
                    hasSearch ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearSearch}>
                            Hapus filter
                        </Button>
                    ) : can('role.create') ? (
                        <Button asChild size="sm">
                            <Link to="/roles/new">
                                <Plus aria-hidden="true" />
                                Tambah role
                            </Link>
                        </Button>
                    ) : undefined
                }
                pagination={pagination}
                onRowClick={(role) => void navigate(`/roles/${role.id}`)}
            />
            <DeleteRoleDialog
                role={pendingDelete}
                onClose={() => setPendingDelete(null)}
                onDeleted={() => setPendingDelete(null)}
            />
        </section>
    );
}
