import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { PaginationMeta } from '@/types/api-response';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './dataTableColumns';

interface Row {
    id: string;
    name: string;
}

const columns: DataTableColumn<Row>[] = [
    { id: 'name', header: 'Nama', accessorKey: 'name', enableSorting: true },
    { id: 'id', header: 'Kode', accessorKey: 'id' },
];

const pagination: PaginationMeta = {
    current_page: 2,
    per_page: 20,
    total: 45,
    last_page: 3,
    from: 21,
    to: 40,
};

type Props = ComponentProps<typeof DataTable<Row>>;

function renderTable(overrides: Partial<Props> = {}) {
    const props: Props = {
        columns,
        rows: [{ id: 'A1', name: 'Finance' }],
        getRowId: (row) => row.id,
        isLoading: false,
        error: null,
        onRetry: vi.fn(),
        loadingLabel: 'Memuat departemen',
        errorTitle: 'Departemen tidak dapat dimuat',
        emptyTitle: 'Belum ada departemen',
        ...overrides,
    };

    render(<DataTable {...props} />);

    return props;
}

it('shows the rows', () => {
    renderTable();

    expect(screen.getByRole('cell', { name: 'Finance' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'A1' })).toBeInTheDocument();
});

it('shows the loading state', () => {
    renderTable({ isLoading: true, rows: undefined });

    expect(screen.getByRole('status', { name: 'Memuat departemen' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('shows the empty state', () => {
    renderTable({ rows: [], emptyDescription: 'Tambahkan departemen pertama.' });

    expect(screen.getByText('Belum ada departemen')).toBeVisible();
    expect(screen.getByText('Tambahkan departemen pertama.')).toBeVisible();
});

it('shows the error state and can retry', async () => {
    const user = userEvent.setup();
    const props = renderTable({
        rows: undefined,
        error: new ApiError({ status: 403, code: 'AUTH_FORBIDDEN' }),
    });

    const alert = screen.getByRole('alert');

    expect(within(alert).getByText('Departemen tidak dapat dimuat')).toBeVisible();
    expect(
        within(alert).getByText('Anda tidak memiliki izin untuk melakukan tindakan ini.'),
    ).toBeVisible();

    await user.click(within(alert).getByRole('button', { name: 'Coba lagi' }));

    expect(props.onRetry).toHaveBeenCalledOnce();
});

describe('sorting', () => {
    it('only offers sorting on columns that enable it', () => {
        renderTable({ onSortChange: vi.fn() });

        expect(screen.getByRole('button', { name: 'Nama' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Kode' })).not.toBeInTheDocument();
    });

    it('sorts ascending first', async () => {
        const user = userEvent.setup();
        const onSortChange = vi.fn();
        renderTable({ onSortChange });

        await user.click(screen.getByRole('button', { name: 'Nama' }));

        expect(onSortChange).toHaveBeenCalledWith({ field: 'name', direction: 'asc' });
    });

    it('toggles the direction and exposes it to assistive technology', async () => {
        const user = userEvent.setup();
        const onSortChange = vi.fn();
        renderTable({ onSortChange, sort: { field: 'name', direction: 'asc' } });

        expect(screen.getByRole('columnheader', { name: 'Nama' })).toHaveAttribute(
            'aria-sort',
            'ascending',
        );

        await user.click(screen.getByRole('button', { name: 'Nama' }));

        expect(onSortChange).toHaveBeenCalledWith({ field: 'name', direction: 'desc' });
    });
});

describe('pagination', () => {
    it('summarizes the range and moves between pages', async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();
        renderTable({ pagination, onPageChange });

        expect(screen.getByText('Menampilkan 21–40 dari 45 data')).toBeVisible();
        expect(screen.getByText('Halaman 2 dari 3')).toBeVisible();

        await user.click(screen.getByRole('button', { name: 'Berikutnya' }));
        await user.click(screen.getByRole('button', { name: 'Sebelumnya' }));

        expect(onPageChange.mock.calls).toEqual([[3], [1]]);
    });

    it('disables moving past the first and last page', () => {
        renderTable({
            pagination: { ...pagination, current_page: 1, last_page: 1 },
            onPageChange: vi.fn(),
        });

        expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeDisabled();
    });
});
