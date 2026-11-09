import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { TableSkeleton } from './skeletons';

it('announces what is loading and matches the table shape', () => {
    render(<TableSkeleton label="Memuat pengguna" columns={4} rows={3} />);

    const status = screen.getByRole('status', { name: 'Memuat pengguna' });
    const rows = screen.getAllByTestId('skeleton-row');

    expect(status).toBeInTheDocument();
    expect(rows).toHaveLength(3);
    expect(rows[0].children).toHaveLength(4);
});
