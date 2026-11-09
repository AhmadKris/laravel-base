import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('shows the application name', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Enterprise System' })).toBeInTheDocument();
});
