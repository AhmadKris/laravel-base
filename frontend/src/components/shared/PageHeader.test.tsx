import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

it('shows the title as the page heading with its description and actions', () => {
    render(
        <PageHeader
            title="Pengguna"
            description="Kelola akun pengguna."
            actions={<button type="button">Tambah pengguna</button>}
        />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Pengguna' })).toBeVisible();
    expect(screen.getByText('Kelola akun pengguna.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tambah pengguna' })).toBeVisible();
});

it('renders only the title when nothing else is given', () => {
    const { container } = render(<PageHeader title="Beranda" />);

    expect(container.querySelector('p')).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
