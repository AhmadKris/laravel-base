import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { DataTable } from '@/components/shared/DataTable';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
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
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useLastPageCorrection, useTableParams } from '@/hooks/useTableParams';
import { AUDIT_MODULES } from '@/lib/audit-events';
import { type DatePreset, dateRangeParams, readDateRange, toApiRange } from '@/lib/date-range';
import type { AuditModule } from '@/types/api-response';
import { auditLogColumns } from '../components/auditLogColumns';
import { type AuditLogFilters, auditLogKeys, auditLogService } from '../services/auditLogService';

const ALL_MODULES = 'all';

// The page opens on today, which keeps the first load small and covers the usual daily review.
const DEFAULT_PERIOD: DatePreset = 'today';

function readModule(value: string | null): AuditModule | undefined {
    return AUDIT_MODULES.find((module) => module.value === value)?.value;
}

export function AuditLogListPage() {
    const { params, filters, searchInput, changeSearch, updateParams, tableProps } =
        useTableParams();
    const navigate = useNavigate();
    const { timeZone } = usePublicSettings();
    const range = readDateRange(params, DEFAULT_PERIOD);

    const auditFilters: AuditLogFilters = {
        ...filters,
        user_id: params.get('user_id') ?? undefined,
        module: readModule(params.get('module')),
        ...toApiRange(range, timeZone),
    };

    const logs = useQuery({
        queryKey: auditLogKeys.list(auditFilters),
        queryFn: () => auditLogService.list(auditFilters),
        placeholderData: keepPreviousData,
    });

    const pagination = logs.data?.meta.pagination;

    useLastPageCorrection(
        filters.page,
        logs.data?.data.length === 0,
        pagination?.last_page ?? 1,
        logs.isPlaceholderData,
        updateParams,
    );

    const hasOtherFilters =
        auditFilters.search !== undefined ||
        auditFilters.user_id !== undefined ||
        auditFilters.module !== undefined;
    const hasFilters = hasOtherFilters || range.preset !== DEFAULT_PERIOD;
    const activeFilters =
        (auditFilters.module === undefined ? 0 : 1) + (range.preset === DEFAULT_PERIOD ? 0 : 1);
    const filteredActor = logs.data?.data.find(
        (log) => log.actor?.id === auditFilters.user_id,
    )?.actor;

    const clearFilters = () => {
        changeSearch('');
        updateParams({
            search: undefined,
            user_id: undefined,
            module: undefined,
            ...dateRangeParams({ preset: DEFAULT_PERIOD }, DEFAULT_PERIOD),
            page: undefined,
        });
    };

    return (
        <section className="flex flex-col gap-4">
            <PageHeader
                title="Audit Log"
                description="Riwayat aktivitas pengguna dan perubahan sistem. Hanya dapat dibaca."
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                    label="Cari aktivitas atau pengguna"
                    placeholder="Cari aktivitas atau pengguna"
                    value={searchInput}
                    onChange={changeSearch}
                />
                <FilterBar activeCount={activeFilters}>
                    <Select
                        value={auditFilters.module ?? ALL_MODULES}
                        onValueChange={(value) =>
                            updateParams({
                                module: value === ALL_MODULES ? undefined : value,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger aria-label="Filter modul" className="w-full sm:w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_MODULES}>Semua modul</SelectItem>
                            {AUDIT_MODULES.map((module) => (
                                <SelectItem key={module.value} value={module.value}>
                                    {module.label}
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
                            Hapus semua filter
                        </Button>
                    )}
                </FilterBar>
            </div>
            {auditFilters.user_id !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                    <span>
                        Aktivitas oleh{' '}
                        <span className="font-medium">
                            {filteredActor?.name ?? 'pengguna terpilih'}
                        </span>
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Hapus filter pengguna"
                        onClick={() => updateParams({ user_id: undefined, page: undefined })}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </div>
            )}
            <DataTable
                {...tableProps}
                columns={auditLogColumns}
                rows={logs.data?.data}
                getRowId={(log) => String(log.id)}
                isLoading={logs.isPending}
                error={logs.error}
                onRetry={() => void logs.refetch()}
                loadingLabel="Memuat audit log"
                errorTitle="Audit log tidak dapat dimuat"
                emptyTitle={
                    hasFilters ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas hari ini'
                }
                emptyDescription={
                    hasFilters
                        ? 'Ubah atau hapus filter.'
                        : 'Pilih rentang waktu lain untuk melihat aktivitas sebelumnya.'
                }
                pagination={pagination}
                onRowClick={(log) => void navigate(`/audit-logs/${log.id}`)}
            />
        </section>
    );
}
