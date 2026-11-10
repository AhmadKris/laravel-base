import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

it('offers a clear button when text is present', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="admin" onChange={onChange} label="Cari role" placeholder="Cari" />);

    await user.click(screen.getByRole('button', { name: 'Hapus pencarian' }));

    expect(onChange).toHaveBeenCalledWith('');
});

it('hides the clear button when empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} label="Cari role" placeholder="Cari" />);

    expect(screen.queryByRole('button', { name: 'Hapus pencarian' })).not.toBeInTheDocument();
});
