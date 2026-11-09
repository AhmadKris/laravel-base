import {
    type ColumnDef,
    type RowData,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table';

export const dataTableFeatures = tableFeatures({ rowSortingFeature });

export type DataTableColumn<TRow extends RowData> = ColumnDef<typeof dataTableFeatures, TRow>;
