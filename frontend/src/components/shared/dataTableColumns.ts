import {
    type CellData,
    type ColumnDef,
    type RowData,
    rowSortingFeature,
    type TableFeatures,
    tableFeatures,
} from '@tanstack/react-table';

declare module '@tanstack/react-table' {
    /* eslint-disable @typescript-eslint/no-unused-vars -- the type parameters must match the declaration being extended */
    interface ColumnMeta<
        in out TFeatures extends TableFeatures,
        in out TData extends RowData,
        TValue extends CellData = CellData,
    > {
        /**
         * Hides a secondary column from the table below 1280 px, so a tablet table fits without
         * scrolling sideways. Phone cards and the detail page still show the value.
         */
        wideScreenOnly?: boolean;
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
}

export const PER_PAGE_OPTIONS = [10, 20, 50, 100];

// Sent with every list request, so a table shows this many rows until the user picks another size.
export const DEFAULT_PER_PAGE = 10;

export const dataTableFeatures = tableFeatures({ rowSortingFeature });

export type DataTableColumn<TRow extends RowData> = ColumnDef<typeof dataTableFeatures, TRow>;
