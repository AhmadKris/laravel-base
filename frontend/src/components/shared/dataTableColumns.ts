import {
    type ColumnDef,
    type RowData,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table';

export const PER_PAGE_OPTIONS = [10, 20, 50, 100];

// Sent with every list request, so a table shows this many rows until the user picks another size.
export const DEFAULT_PER_PAGE = 10;

export const dataTableFeatures = tableFeatures({ rowSortingFeature });

export type DataTableColumn<TRow extends RowData> = ColumnDef<typeof dataTableFeatures, TRow>;
