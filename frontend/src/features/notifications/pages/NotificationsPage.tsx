import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DataTable } from '@/components/shared/DataTable';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
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
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useLastPageCorrection, useTableParams } from '@/hooks/useTableParams';
import { type DatePreset, dateRangeParams, readDateRange, toApiRange } from '@/lib/date-range';
import type { Notification, NotificationCategory } from '@/types/api-response';
import { NOTIFICATION_CATEGORIES } from '../categories';
import { notificationColumns } from '../components/notificationColumns';
import {
    isSafeInternalPath,
    useMarkAllNotificationsAsRead,
    useMarkNotificationAsRead,
    useUnreadNotificationCount,
} from '../hooks/useNotifications';
import {
    type NotificationFilters,
    notificationKeys,
    notificationService,
    type NotificationStatusFilter,
} from '../services/notificationService';

const ALL_VALUES = 'all';
const DEFAULT_PERIOD: DatePreset = 'all';

function readStatus(value: string | null): NotificationStatusFilter | undefined {
    return value === 'unread' || value === 'read' ? value : undefined;
}

function readCategory(value: string | null): NotificationCategory | undefined {
    return NOTIFICATION_CATEGORIES.find((item) => item.value === value)?.value;
}

export function NotificationsPage() {
    const { params, filters, searchInput, changeSearch, updateParams, tableProps } =
        useTableParams();
    const navigate = useNavigate();
    const { timeZone } = usePublicSettings();
    const range = readDateRange(params, DEFAULT_PERIOD);

    const notificationFilters: NotificationFilters = {
        ...filters,
        status: readStatus(params.get('status')),
        category: readCategory(params.get('category')),
        ...toApiRange(range, timeZone),
    };

    const notifications = useQuery({
        queryKey: notificationKeys.list(notificationFilters),
        queryFn: () => notificationService.list(notificationFilters),
        placeholderData: keepPreviousData,
    });

    const unreadCountQuery = useUnreadNotificationCount();
    const unreadCount = unreadCountQuery.data?.unread_count ?? 0;

    const markAsRead = useMarkNotificationAsRead();
    const markAll = useMarkAllNotificationsAsRead();

    const pagination = notifications.data?.meta.pagination;
    useLastPageCorrection(
        filters.page,
        notifications.data?.data.length === 0,
        pagination?.last_page ?? 1,
        notifications.isPlaceholderData,
        updateParams,
    );

    const pendingId = markAsRead.isPending ? markAsRead.variables : undefined;

    const columns = useMemo(
        () =>
            notificationColumns({
                onMarkAsRead: (item) => markAsRead.mutate(item.id),
                isPendingId: pendingId,
            }),
        [markAsRead, pendingId],
    );

    const activeFilters =
        (notificationFilters.status === undefined ? 0 : 1) +
        (notificationFilters.category === undefined ? 0 : 1) +
        (range.preset === DEFAULT_PERIOD ? 0 : 1);
    const hasFilters = notificationFilters.search !== undefined || activeFilters > 0;

    const clearFilters = () => {
        updateParams({
            search: undefined,
            status: undefined,
            category: undefined,
            ...dateRangeParams({ preset: DEFAULT_PERIOD }, DEFAULT_PERIOD),
            page: undefined,
        });
    };

    const handleRowClick = (item: Notification) => {
        if (!item.is_read) {
            markAsRead.mutate(item.id);
        }

        if (isSafeInternalPath(item.action_url)) {
            void navigate(item.action_url);
        }
    };

    return (
        <section className="flex flex-col gap-4">
            <PageHeader
                title="Notifikasi"
                description="Pemberitahuan keamanan akun dan perubahan akses untuk akun Anda."
                actions={
                    <Button
                        type="button"
                        variant="outline"
                        disabled={unreadCount === 0}
                        loading={markAll.isPending}
                        onClick={() => markAll.mutate()}
                    >
                        Tandai semua dibaca
                    </Button>
                }
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                    label="Cari notifikasi"
                    placeholder="Cari judul atau isi notifikasi"
                    value={searchInput}
                    onChange={changeSearch}
                />
                <FilterBar activeCount={activeFilters}>
                    <Select
                        value={notificationFilters.status ?? ALL_VALUES}
                        onValueChange={(value) =>
                            updateParams({
                                status: value === ALL_VALUES ? undefined : value,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger aria-label="Filter status baca" className="w-full sm:w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_VALUES}>Semua status</SelectItem>
                            <SelectItem value="unread">Belum dibaca</SelectItem>
                            <SelectItem value="read">Sudah dibaca</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={notificationFilters.category ?? ALL_VALUES}
                        onValueChange={(value) =>
                            updateParams({
                                category: value === ALL_VALUES ? undefined : value,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger aria-label="Filter kategori" className="w-full sm:w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_VALUES}>Semua kategori</SelectItem>
                            {NOTIFICATION_CATEGORIES.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DateRangeFilter
                        value={range}
                        timeZone={timeZone}
                        onChange={(next) =>
                            updateParams({
                                ...dateRangeParams(next, DEFAULT_PERIOD),
                                page: undefined,
                            })
                        }
                    />
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
                rows={notifications.data?.data}
                getRowId={(item) => item.id}
                isLoading={notifications.isPending}
                error={notifications.error}
                onRetry={() => void notifications.refetch()}
                loadingLabel="Memuat daftar notifikasi"
                errorTitle="Notifikasi tidak dapat dimuat"
                emptyTitle={hasFilters ? 'Tidak ada notifikasi yang cocok' : 'Belum ada notifikasi'}
                emptyDescription={
                    hasFilters
                        ? 'Ubah kata kunci atau filter yang dipilih.'
                        : 'Pemberitahuan akun dan sistem akan muncul di sini.'
                }
                emptyAction={
                    hasFilters ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                            Hapus filter
                        </Button>
                    ) : undefined
                }
                pagination={pagination}
                onRowClick={handleRowClick}
            />
        </section>
    );
}
