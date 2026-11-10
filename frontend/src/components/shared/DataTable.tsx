import { flexRender, type RowData, useTable } from '@tanstack/react-table';
import { cn } from 'cn';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
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
function isRowActivation(event: MouseEvent<HTMLElement>): boolean {
    const target = event.target as Element;

    return (
        event.currentTarget.contains(target) &&
        target.closest('a, button, input, select, label') === null &&
        window.getSelection()?.isCollapsed !== false
    );
}

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown };
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

// The column id the list pages use for row actions; on cards it sits next to the title.
const ACTIONS_COLUMN = 'actions';

const WIDE_SCREEN_ONLY = 'hidden xl:table-cell';

function headerLabel(header: unknown): string {
    return typeof header === 'string' ? header : '';
}

interface MobileSortSelectProps<TRow extends RowData> {
    columns: DataTableColumn<TRow>[];
    sort: DataTableSort | undefined;
    onSortChange: (sort: DataTableSort) => void;
}

/**
 * Cards have no column headers to click, so the sortable columns are offered in a list instead.
 */
function MobileSortSelect<TRow extends RowData>({
    columns,
    sort,
    onSortChange,
}: MobileSortSelectProps<TRow>) {
    const options = columns
        .filter((column) => column.enableSorting === true && column.id !== undefined)
        .flatMap((column) => {
            const label = headerLabel(column.header);

            return [
                { value: `${column.id}:asc`, label: `${label}, naik` },
                { value: `${column.id}:desc`, label: `${label}, turun` },
            ];
        });

    if (options.length === 0) {
        return null;
    }

    return (
        <div className="border-b px-4 py-3">
            <Select
                value={sort === undefined ? undefined : `${sort.field}:${sort.direction}`}
                onValueChange={(value) => {
                    const [field, direction] = value.split(':');
                    onSortChange({ field, direction: direction === 'desc' ? 'desc' : 'asc' });
                }}
            >
                <SelectTrigger size="sm" aria-label="Urutkan data" className="w-full">
                    <SelectValue placeholder="Urutkan data" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/**
 * Columns are not sortable unless they set `enableSorting: true`. The column id is sent as the sort field.
 *
 * On phones each row becomes a card: the first column is its title, the actions column sits beside it,
 * and the other columns are listed with their header as label, so nothing needs sideways scrolling.
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
    const isMobile = useIsMobile();
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

    const paginationBar = pagination !== undefined && onPageChange !== undefined && (
        <div className="border-t px-4 py-3">
            <PaginationControls
                pagination={pagination}
                onPageChange={onPageChange}
                onPerPageChange={onPerPageChange}
            />
        </div>
    );

    if (isMobile) {
        return (
            <Card className="gap-0 py-0">
                {onSortChange !== undefined && (
                    <MobileSortSelect columns={columns} sort={sort} onSortChange={onSortChange} />
                )}
                <ul className="divide-y">
                    {table.getRowModel().rows.map((row) => {
                        const [title, ...rest] = row.getAllCells();
                        const actions = rest.find((cell) => cell.column.id === ACTIONS_COLUMN);
                        const details = rest.filter((cell) => cell !== actions);

                        return (
                            <li
                                key={row.id}
                                className={cn(
                                    'grid gap-2 px-4 py-3',
                                    onRowClick && 'cursor-pointer',
                                )}
                                onClick={(event) => {
                                    if (onRowClick !== undefined && isRowActivation(event)) {
                                        onRowClick(row.original);
                                    }
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        {flexRender(
                                            title.column.columnDef.cell,
                                            title.getContext(),
                                        )}
                                    </div>
                                    {actions !== undefined && (
                                        <div className="shrink-0">
                                            {flexRender(
                                                actions.column.columnDef.cell,
                                                actions.getContext(),
                                            )}
                                        </div>
                                    )}
                                </div>
                                {details.length > 0 && (
                                    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
                                        {details.map((cell) => (
                                            <div key={cell.id} className="contents">
                                                <dt className="text-xs leading-5 text-muted-foreground">
                                                    {headerLabel(cell.column.columnDef.header)}
                                                </dt>
                                                <dd className="min-w-0 break-words">
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                            </li>
                        );
                    })}
                </ul>
                {paginationBar}
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
                                        className={cn(
                                            'sticky top-0 z-10 bg-card px-4 shadow-[inset_0_-1px_0_var(--border)]',
                                            header.column.columnDef.meta?.wideScreenOnly &&
                                                WIDE_SCREEN_ONLY,
                                        )}
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
                                <TableCell
                                    key={cell.id}
                                    className={cn(
                                        'px-4',
                                        cell.column.columnDef.meta?.wideScreenOnly &&
                                            WIDE_SCREEN_ONLY,
                                    )}
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {paginationBar}
        </Card>
    );
}
