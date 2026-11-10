import { render, screen } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router';
import { expect, it } from 'vitest';
import { Button } from './button';

it('shows a spinner and blocks a second click while loading', () => {
    render(<Button loading>Simpan pengguna</Button>);

    const button = screen.getByRole('button', { name: 'Simpan pengguna' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg.animate-spin')).not.toBeNull();
});

it('stays a plain enabled button when not loading', () => {
    render(<Button>Simpan pengguna</Button>);

    const button = screen.getByRole('button', { name: 'Simpan pengguna' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button.querySelector('svg')).toBeNull();
});

it('passes a link through unchanged', () => {
    render(
        <MemoryRouter>
            <Button asChild>
                <Link to="/users">Daftar pengguna</Link>
            </Button>
        </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Daftar pengguna' })).toHaveAttribute('href', '/users');
});
