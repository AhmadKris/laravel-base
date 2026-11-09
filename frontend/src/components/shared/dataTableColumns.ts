import {
    type ColumnDef,
    type RowData,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table';

export const PER_PAGE_OPTIONS = [10, 20, 50, 100];

export const dataTableFeatures = tableFeatures({ rowSortingFeature });

export type DataTableColumn<TRow extends RowData> = ColumnDef<typeof dataTableFeatures, TRow>;
