import { flexRender, type RowData, useTable } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { PaginationControls } from './PaginationControls';
import { TableSkeleton } from './skeletons';

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
    onPerPageChange?: (perPage: number) => void;
    onRowClick?: (row: TRow) => void;
    sort?: DataTableSort;
    onSortChange?: (sort: DataTableSort) => void;
}

function nextSort(field: string, current: DataTableSort | undefined): DataTableSort {
    return {
        field,
        direction: current?.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    };
}

/**
 * Controls inside a row keep their own behavior, and menus rendered in a portal still bubble to the row in React.
 */
function isRowActivation(event: MouseEvent<HTMLTableRowElement>): boolean {
    const target = event.target as Element;

    return (
        event.currentTarget.contains(target) &&
        target.closest('a, button, input, select, label') === null &&
        window.getSelection()?.isCollapsed !== false
    );
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
    onPerPageChange,
    onRowClick,
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
        return (
            <Card className="gap-0 py-0">
                <TableSkeleton label={loadingLabel} columns={columns.length} />
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="gap-0 py-0">
                <ErrorState
                    title={errorTitle}
                    message={toApiError(error).message}
                    onRetry={onRetry}
                />
            </Card>
        );
    }

    if (rows === undefined || rows.length === 0) {
        return (
            <Card className="gap-0 py-0">
                <EmptyState title={emptyTitle} description={emptyDescription} />
            </Card>
        );
    }

    return (
        <Card className="gap-0 py-0">
            <Table containerClassName="max-h-[70svh] overflow-y-auto">
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const activeDirection =
                                    sort?.field === header.column.id ? sort?.direction : undefined;
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
                                        className="sticky top-0 z-10 bg-card px-4 shadow-[inset_0_-1px_0_var(--border)]"
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
                                                className="-ml-2.5"
                                                onClick={() =>
                                                    onSortChange(nextSort(header.column.id, sort))
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
                        <TableRow
                            key={row.id}
                            className={onRowClick ? 'cursor-pointer' : undefined}
                            onClick={(event) => {
                                if (onRowClick !== undefined && isRowActivation(event)) {
                                    onRowClick(row.original);
                                }
                            }}
                        >
                            {row.getAllCells().map((cell) => (
                                <TableCell key={cell.id} className="px-4">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {pagination !== undefined && onPageChange !== undefined && (
                <div className="border-t px-4 py-3">
                    <PaginationControls
                        pagination={pagination}
                        onPageChange={onPageChange}
                        onPerPageChange={onPerPageChange}
                    />
                </div>
            )}
        </Card>
    );
}
