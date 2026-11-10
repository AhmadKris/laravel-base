import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
        rows: [{ id: 'A1', name: 'Ani' }],
        getRowId: (row) => row.id,
        isLoading: false,
        error: null,
        onRetry: vi.fn(),
        loadingLabel: 'Memuat pengguna',
        errorTitle: 'Pengguna tidak dapat dimuat',
        emptyTitle: 'Belum ada pengguna',
        ...overrides,
    };

    render(<DataTable {...props} />);

    return props;
}

it('shows the rows', () => {
    renderTable();

    expect(screen.getByRole('cell', { name: 'Ani' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'A1' })).toBeInTheDocument();
});

it('shows the loading state', () => {
    renderTable({ isLoading: true, rows: undefined });

    expect(screen.getByRole('status', { name: 'Memuat pengguna' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('shows the empty state and optional action', () => {
    renderTable({
        rows: [],
        emptyDescription: 'Tambahkan pengguna pertama.',
        emptyAction: <button type="button">Tambah sekarang</button>,
    });

    expect(screen.getByText('Belum ada pengguna')).toBeVisible();
    expect(screen.getByText('Tambahkan pengguna pertama.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tambah sekarang' })).toBeVisible();
});

it('shows the error state and can retry', async () => {
    const user = userEvent.setup();
    const props = renderTable({
        rows: undefined,
        error: new ApiError({ status: 403, code: 'AUTH_FORBIDDEN' }),
    });

    const alert = screen.getByRole('alert');

    expect(within(alert).getByText('Pengguna tidak dapat dimuat')).toBeVisible();
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

        expect(screen.getByText('Menampilkan 21 sampai 40 dari 45 data')).toBeVisible();
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

describe('rows per page', () => {
    it('shows the current size and reports a new one', async () => {
        const user = userEvent.setup();
        const onPerPageChange = vi.fn();
        renderTable({ pagination, onPageChange: vi.fn(), onPerPageChange });

        const select = screen.getByRole('combobox', { name: 'Jumlah data per halaman' });
        expect(select).toHaveTextContent('20 per halaman');

        await user.click(select);
        const options = await screen.findAllByRole('option');
        expect(options.map((option) => option.textContent)).toEqual([
            '10 per halaman',
            '20 per halaman',
            '50 per halaman',
            '100 per halaman',
        ]);

        await user.click(screen.getByRole('option', { name: '50 per halaman' }));

        expect(onPerPageChange).toHaveBeenCalledWith(50);
    });

    it('is left out when the page does not support it', () => {
        renderTable({ pagination, onPageChange: vi.fn() });

        expect(
            screen.queryByRole('combobox', { name: 'Jumlah data per halaman' }),
        ).not.toBeInTheDocument();
    });
});

describe('row click', () => {
    const interactiveColumns: DataTableColumn<Row>[] = [
        { id: 'name', header: 'Nama', accessorKey: 'name' },
        {
            id: 'link',
            header: 'Tautan',
            cell: () => <a href="#detail">Buka</a>,
        },
        {
            id: 'action',
            header: 'Aksi',
            cell: () => <button type="button">Aksi</button>,
        },
    ];

    it('reports the clicked row', async () => {
        const user = userEvent.setup();
        const onRowClick = vi.fn();
        renderTable({ columns: interactiveColumns, onRowClick });

        await user.click(screen.getByRole('cell', { name: 'Ani' }));

        expect(onRowClick).toHaveBeenCalledWith({ id: 'A1', name: 'Ani' });
    });

    it.each([
        ['link', 'Buka'],
        ['button', 'Aksi'],
    ] as const)('ignores a click on a %s inside the row', async (role, name) => {
        const user = userEvent.setup();
        const onRowClick = vi.fn();
        renderTable({ columns: interactiveColumns, onRowClick });

        await user.click(screen.getByRole(role, { name }));

        expect(onRowClick).not.toHaveBeenCalled();
    });

    it('ignores a click that ends a text selection', async () => {
        const user = userEvent.setup();
        const onRowClick = vi.fn();
        renderTable({ columns: interactiveColumns, onRowClick });
        vi.spyOn(window, 'getSelection').mockReturnValue({ isCollapsed: false } as Selection);

        await user.click(screen.getByRole('cell', { name: 'Ani' }));

        expect(onRowClick).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});

const wideColumns: DataTableColumn<Row>[] = [
    { id: 'name', header: 'Nama', accessorKey: 'name' },
    { id: 'id', header: 'Kode', accessorKey: 'id', meta: { wideScreenOnly: true } },
];

it('leaves a secondary column out of the table below wide screens', () => {
    renderTable({ columns: wideColumns });

    expect(screen.getByRole('columnheader', { name: 'Kode' })).toHaveClass(
        'hidden',
        'xl:table-cell',
    );
    expect(screen.getByRole('cell', { name: 'A1' })).toHaveClass('hidden', 'xl:table-cell');
    expect(screen.getByRole('cell', { name: 'Ani' })).not.toHaveClass('hidden');
});

describe('on a phone', () => {
    const desktopWidth = window.innerWidth;

    beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: desktopWidth });
    });

    it('shows each row as a card with labelled values instead of a table', () => {
        renderTable();

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        const card = screen.getByRole('listitem');
        expect(within(card).getByText('Ani')).toBeVisible();
        expect(within(card).getByText('Kode')).toBeVisible();
        expect(within(card).getByText('A1')).toBeVisible();
    });

    it('still shows a secondary column in the card', () => {
        renderTable({ columns: wideColumns });

        expect(within(screen.getByRole('listitem')).getByText('A1')).toBeVisible();
    });

    it('opens the row from its card', async () => {
        const onRowClick = vi.fn();
        renderTable({ onRowClick });

        await userEvent.click(screen.getByText('A1'));

        expect(onRowClick).toHaveBeenCalledWith({ id: 'A1', name: 'Ani' });
    });

    it('offers the sortable columns in a list', async () => {
        const onSortChange = vi.fn();
        renderTable({ onSortChange, sort: { field: 'name', direction: 'asc' } });

        const select = screen.getByRole('combobox', { name: 'Urutkan data' });
        expect(select).toHaveTextContent('Nama, naik');

        await userEvent.click(select);
        await userEvent.click(await screen.findByRole('option', { name: 'Nama, turun' }));

        expect(onSortChange).toHaveBeenCalledWith({ field: 'name', direction: 'desc' });
        expect(screen.queryByRole('option', { name: /Kode/ })).not.toBeInTheDocument();
    });
});
