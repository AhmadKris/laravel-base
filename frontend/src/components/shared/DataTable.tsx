import { flexRender, type RowData, useTable } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toApiError } from '@/lib/api-error';
import type { PaginationMeta } from '@/types/api-response';
import { type DataTableColumn, dataTableFeatures } from './dataTableColumns';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { PaginationControls } from './PaginationControls';

export interface DataTableSort {
    field: string;
    direction: 'asc' | 'desc';
}

interface DataTableProps<TRow extends RowData> {
    columns: DataTableColumn<TRow>[];
    rows: TRow[] | undefined;
    getRowId: (row: TRow) => string;
    isLoading: boolean;
    error: unknown;
    onRetry: () => void;
    loadingLabel: string;
    errorTitle: string;
    emptyTitle: string;
    emptyDescription?: string;
    pagination?: PaginationMeta;
    onPageChange?: (page: number) => void;
    sort?: DataTableSort;
    onSortChange?: (sort: DataTableSort) => void;
}

function nextSort(field: string, current: DataTableSort | undefined): DataTableSort {
    return {
        field,
        direction: current?.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    };
}

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown };
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

/**
 * Columns are not sortable unless they set `enableSorting: true`. The column id is sent as the sort field.
 */
export function DataTable<TRow extends RowData>({
    columns,
    rows,
    getRowId,
    isLoading,
    error,
    onRetry,
    loadingLabel,
    errorTitle,
    emptyTitle,
    emptyDescription,
    pagination,
    onPageChange,
    sort,
    onSortChange,
}: DataTableProps<TRow>) {
    const table = useTable({
        features: dataTableFeatures,
        columns,
        data: rows ?? [],
        getRowId,
        manualSorting: true,
        defaultColumn: { enableSorting: false },
    });

    if (isLoading) {
        return <LoadingState label={loadingLabel} rows={5} />;
    }

    if (error) {
        return (
            <ErrorState title={errorTitle} message={toApiError(error).message} onRetry={onRetry} />
        );
    }

    if (rows === undefined || rows.length === 0) {
        return <EmptyState title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const activeDirection =
                                        sort?.field === header.column.id
                                            ? sort?.direction
                                            : undefined;
                                    const SortIcon =
                                        activeDirection === undefined
                                            ? ArrowUpDown
                                            : SORT_ICONS[activeDirection];
                                    const headerContent = flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                    );

                                    return (
                                        <TableHead
                                            key={header.id}
                                            aria-sort={
                                                activeDirection === undefined
                                                    ? undefined
                                                    : ARIA_SORT[activeDirection]
                                            }
                                        >
                                            {header.column.getCanSort() &&
                                            onSortChange !== undefined ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        onSortChange(
                                                            nextSort(header.column.id, sort),
                                                        )
                                                    }
                                                >
                                                    {headerContent}
                                                    <SortIcon aria-hidden="true" />
                                                </Button>
                                            ) : (
                                                headerContent
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getAllCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {pagination !== undefined && onPageChange !== undefined && (
                <PaginationControls pagination={pagination} onPageChange={onPageChange} />
            )}
        </div>
    );
}
