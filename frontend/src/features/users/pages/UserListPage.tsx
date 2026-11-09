import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { DataTable, type DataTableSort } from '@/components/shared/DataTable';
import { PER_PAGE_OPTIONS } from '@/components/shared/dataTableColumns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/api-response';
import { userColumns } from '../components/userColumns';
import { UserStatusDialog } from '../components/UserStatusDialog';
import { userKeys, type UserListFilters, userService } from '../services/userService';

const ALL_STATUSES = 'all';
const SEARCH_DELAY_MS = 300;

type ParamChanges = Record<string, string | undefined>;

function readFilters(params: URLSearchParams): UserListFilters {
    const perPage = Number(params.get('per_page'));

    return {
        page: Math.max(Number(params.get('page')) || 1, 1),
        per_page: PER_PAGE_OPTIONS.includes(perPage) ? perPage : undefined,
        search: params.get('search') ?? undefined,
        status: params.get('status') ?? undefined,
        sort_by: params.get('sort_by') ?? undefined,
        sort_direction: params.get('sort_direction') ?? undefined,
    };
}

function readSort(filters: UserListFilters): DataTableSort | undefined {
    return filters.sort_by === undefined
        ? undefined
        : {
              field: filters.sort_by,
              direction: filters.sort_direction === 'desc' ? 'desc' : 'asc',
          };
}

export function UserListPage() {
    const [params, setParams] = useSearchParams();
    const { can } = usePermission();
    const navigate = useNavigate();
    const currentUserId = useAuthStore((state) => state.user?.id);
    const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
    const [statusTarget, setStatusTarget] = useState<User | null>(null);
    const searchTimer = useRef<number | undefined>(undefined);
    const filters = readFilters(params);

    const updateParams = (changes: ParamChanges) => {
        setParams(
            (current) => {
                const next = new URLSearchParams(current);

                Object.entries(changes).forEach(([key, value]) => {
                    if (value === undefined || value === '') {
                        next.delete(key);
                    } else {
                        next.set(key, value);
                    }
                });

                return next;
            },
            { replace: true },
        );
    };

    useEffect(() => () => window.clearTimeout(searchTimer.current), []);

    const users = useQuery({
        queryKey: userKeys.list(filters),
        queryFn: () => userService.list(filters),
        placeholderData: keepPreviousData,
    });

    const pagination = users.data?.meta.pagination;
    const isPastLastPage = users.data?.data.length === 0 && filters.page > 1;
    const lastPage = pagination?.last_page ?? 1;

    useEffect(() => {
        if (isPastLastPage && !users.isPlaceholderData) {
            setParams(
                (current) => {
                    const next = new URLSearchParams(current);

                    next.set('page', String(lastPage));

                    return next;
                },
                { replace: true },
            );
        }
    }, [isPastLastPage, users.isPlaceholderData, lastPage, setParams]);

    const canUpdate = can('user.update');
    const canDelete = can('user.delete');
    const columns = useMemo(
        () => userColumns({ currentUserId, canUpdate, canDelete, onChangeStatus: setStatusTarget }),
        [currentUserId, canUpdate, canDelete],
    );

    const hasFilters = filters.search !== undefined || filters.status !== undefined;

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
            <div className="flex flex-wrap gap-2">
                <Input
                    type="search"
                    aria-label="Cari nama atau email pengguna"
                    placeholder="Cari nama atau email"
                    className="w-full sm:max-w-xs"
                    value={searchInput}
                    onChange={(event) => {
                        const value = event.target.value;

                        setSearchInput(value);
                        window.clearTimeout(searchTimer.current);
                        searchTimer.current = window.setTimeout(
                            () => updateParams({ search: value.trim(), page: undefined }),
                            SEARCH_DELAY_MS,
                        );
                    }}
                />
                <Select
                    value={filters.status ?? ALL_STATUSES}
                    onValueChange={(value) =>
                        updateParams({
                            status: value === ALL_STATUSES ? undefined : value,
                            page: undefined,
                        })
                    }
                >
                    <SelectTrigger aria-label="Filter status" className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_STATUSES}>Semua status</SelectItem>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="inactive">Nonaktif</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <DataTable
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
                pagination={pagination}
                onPageChange={(page) => updateParams({ page: String(page) })}
                onPerPageChange={(perPage) =>
                    updateParams({ per_page: String(perPage), page: undefined })
                }
                onRowClick={(user) => void navigate(`/users/${user.id}`)}
                sort={readSort(filters)}
                onSortChange={({ field, direction }) =>
                    updateParams({ sort_by: field, sort_direction: direction, page: undefined })
                }
            />
            <UserStatusDialog user={statusTarget} onClose={() => setStatusTarget(null)} />
        </section>
    );
}
