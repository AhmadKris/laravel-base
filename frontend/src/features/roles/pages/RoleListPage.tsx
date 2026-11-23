import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DataTable } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
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
import type { Role } from '@/types/api-response';
import { DeleteRoleDialog } from '../components/DeleteRoleDialog';
import { roleColumns } from '../components/roleColumns';
import { DUPLICATE_ROLE_PERMISSIONS } from '../permissionGroups';
import { roleKeys, roleService } from '../services/roleService';

const ALL_TYPES = 'all';

export function RoleListPage() {
    const {
        params,
        filters: tableFilters,
        searchInput,
        changeSearch,
        updateParams,
        tableProps,
    } = useTableParams();
    const filters = { ...tableFilters, type: params.get('type') ?? undefined };
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
    const canDuplicate = DUPLICATE_ROLE_PERMISSIONS.every((name) => can(name));
    const columns = useMemo(
        () => roleColumns({ canUpdate, canDelete, canDuplicate, onDelete: setPendingDelete }),
        [canUpdate, canDelete, canDuplicate, setPendingDelete],
    );

    const hasFilters = filters.search !== undefined || filters.type !== undefined;

    const clearFilters = () => {
        updateParams({ search: undefined, type: undefined, page: undefined });
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
                <FilterBar activeCount={filters.type === undefined ? 0 : 1}>
                    <Select
                        value={filters.type ?? ALL_TYPES}
                        onValueChange={(value) =>
                            updateParams({
                                type: value === ALL_TYPES ? undefined : value,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger aria-label="Filter jenis role" className="w-full sm:w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_TYPES}>Semua jenis</SelectItem>
                            <SelectItem value="built_in">Bawaan</SelectItem>
                            <SelectItem value="custom">Kustom</SelectItem>
                        </SelectContent>
                    </Select>
                </FilterBar>
                {hasFilters && (
                    <Button type="button" variant="ghost" onClick={clearFilters}>
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
                emptyTitle={hasFilters ? 'Tidak ada role yang cocok' : 'Belum ada role'}
                emptyDescription={
                    hasFilters
                        ? 'Ubah kata kunci pencarian atau filter jenis.'
                        : 'Role yang ditambahkan tampil di sini.'
                }
                emptyAction={
                    hasFilters ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
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
