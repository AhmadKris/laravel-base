import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLastPageCorrection, useTableParams } from '@/hooks/useTableParams';
import { AUDIT_MODULES } from '@/lib/audit-events';
import type { AuditModule } from '@/types/api-response';
import { auditLogColumns } from '../components/auditLogColumns';
import { type AuditLogFilters, auditLogKeys, auditLogService } from '../services/auditLogService';

const ALL_MODULES = 'all';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readDate(value: string | null): string | undefined {
    return value !== null && DATE_PATTERN.test(value) ? value : undefined;
}

function readModule(value: string | null): AuditModule | undefined {
    return AUDIT_MODULES.find((module) => module.value === value)?.value;
}

export function AuditLogListPage() {
    const { params, filters, searchInput, changeSearch, updateParams, tableProps } =
        useTableParams();
    const navigate = useNavigate();

    const auditFilters: AuditLogFilters = {
        ...filters,
        user_id: params.get('user_id') ?? undefined,
        module: readModule(params.get('module')),
        date_from: readDate(params.get('date_from')),
        date_to: readDate(params.get('date_to')),
    };
    // ISO dates compare correctly as text.
    const isRangeInvalid =
        auditFilters.date_from !== undefined &&
        auditFilters.date_to !== undefined &&
        auditFilters.date_to < auditFilters.date_from;

    const logs = useQuery({
        queryKey: auditLogKeys.list(auditFilters),
        queryFn: () => auditLogService.list(auditFilters),
        placeholderData: keepPreviousData,
        enabled: !isRangeInvalid,
    });

    const pagination = logs.data?.meta.pagination;

    useLastPageCorrection(
        filters.page,
        logs.data?.data.length === 0,
        pagination?.last_page ?? 1,
        logs.isPlaceholderData,
        updateParams,
    );

    const hasFilters =
        auditFilters.search !== undefined ||
        auditFilters.user_id !== undefined ||
        auditFilters.module !== undefined ||
        auditFilters.date_from !== undefined ||
        auditFilters.date_to !== undefined;
    const filteredActor = logs.data?.data.find(
        (log) => log.actor?.id === auditFilters.user_id,
    )?.actor;

    const clearFilters = () => {
        changeSearch('');
        updateParams({
            search: undefined,
            user_id: undefined,
            module: undefined,
            date_from: undefined,
            date_to: undefined,
            page: undefined,
        });
    };

    return (
        <section className="flex flex-col gap-4">
            <PageHeader
                title="Audit Log"
                description="Riwayat aktivitas pengguna dan perubahan sistem. Hanya dapat dibaca."
            />
            <div className="flex flex-wrap items-end gap-2">
                <Input
                    type="search"
                    aria-label="Cari nama aktivitas"
                    placeholder="Cari nama aktivitas, misalnya user.created"
                    className="w-full sm:max-w-xs"
                    value={searchInput}
                    onChange={(event) => changeSearch(event.target.value)}
                />
                <Select
                    value={auditFilters.module ?? ALL_MODULES}
                    onValueChange={(value) =>
                        updateParams({
                            module: value === ALL_MODULES ? undefined : value,
                            page: undefined,
                        })
                    }
                >
                    <SelectTrigger aria-label="Filter modul" className="w-40">
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
                <div className="grid gap-1">
                    <Label htmlFor="audit-date-from" className="text-xs text-muted-foreground">
                        Dari tanggal (UTC)
                    </Label>
                    <Input
                        id="audit-date-from"
                        type="date"
                        className="w-40"
                        value={auditFilters.date_from ?? ''}
                        onChange={(event) =>
                            updateParams({ date_from: event.target.value, page: undefined })
                        }
                    />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="audit-date-to" className="text-xs text-muted-foreground">
                        Sampai tanggal (UTC)
                    </Label>
                    <Input
                        id="audit-date-to"
                        type="date"
                        className="w-40"
                        min={auditFilters.date_from}
                        aria-invalid={isRangeInvalid}
                        aria-describedby={isRangeInvalid ? 'audit-date-error' : undefined}
                        value={auditFilters.date_to ?? ''}
                        onChange={(event) =>
                            updateParams({ date_to: event.target.value, page: undefined })
                        }
                    />
                </div>
                {hasFilters && (
                    <Button type="button" variant="ghost" onClick={clearFilters}>
                        Hapus semua filter
                    </Button>
                )}
            </div>
            {isRangeInvalid && (
                <p id="audit-date-error" role="alert" className="text-sm text-destructive">
                    Tanggal akhir tidak boleh lebih awal dari tanggal mulai.
                </p>
            )}
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
                rows={isRangeInvalid ? [] : logs.data?.data}
                getRowId={(log) => String(log.id)}
                isLoading={!isRangeInvalid && logs.isPending}
                error={isRangeInvalid ? null : logs.error}
                onRetry={() => void logs.refetch()}
                loadingLabel="Memuat audit log"
                errorTitle="Audit log tidak dapat dimuat"
                emptyTitle={hasFilters ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas'}
                emptyDescription={
                    hasFilters
                        ? 'Ubah atau hapus filter.'
                        : 'Aktivitas pengguna dan perubahan sistem tercatat di sini.'
                }
                pagination={isRangeInvalid ? undefined : pagination}
                onRowClick={(log) => void navigate(`/audit-logs/${log.id}`)}
            />
        </section>
    );
}
