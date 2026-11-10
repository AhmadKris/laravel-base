import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Link } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTableParams } from './useTableParams';

function Harness() {
    const { filters, searchInput, changeSearch, updateParams } = useTableParams();

    return (
        <div>
            <input
                aria-label="Cari"
                value={searchInput}
                onChange={(event) => changeSearch(event.target.value)}
            />
            <button type="button" onClick={() => updateParams({ search: undefined })}>
                Reset
            </button>
            <Link to="/">Menu</Link>
            <output data-testid="committed">{filters.search ?? ''}</output>
        </div>
    );
}

function renderHarness(initialPath = '/') {
    const router = createMemoryRouter([{ path: '/', element: <Harness /> }], {
        initialEntries: [initialPath],
    });

    render(<RouterProvider router={router} />);

    return {
        input: screen.getByRole('textbox', { name: 'Cari' }),
        committed: screen.getByTestId('committed'),
    };
}

describe('useTableParams', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps a trailing space after the debounce writes the trimmed query', () => {
        vi.useFakeTimers();
        const { input, committed } = renderHarness();

        fireEvent.change(input, { target: { value: 'budi ' } });
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(committed).toHaveTextContent('budi');
        expect(input).toHaveValue('budi ');
    });

    it('preserves typing that continues just as a prior debounced search commits to the URL', () => {
        vi.useFakeTimers();
        const { input, committed } = renderHarness();

        fireEvent.change(input, { target: { value: 'budi s' } });
        act(() => {
            vi.advanceTimersByTime(300);
            fireEvent.change(input, { target: { value: 'budi sa' } });
        });

        expect(input).toHaveValue('budi sa');

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(input).toHaveValue('budi sa');
        expect(committed).toHaveTextContent('budi sa');
    });

    it('resets the input and cancels a pending search when an external link clears the URL', () => {
        vi.useFakeTimers();
        const { input, committed } = renderHarness('/?search=budi');

        expect(input).toHaveValue('budi');
        fireEvent.change(input, { target: { value: 'budiman' } });
        fireEvent.click(screen.getByRole('link', { name: 'Menu' }));

        expect(committed).toHaveTextContent('');
        expect(input).toHaveValue('');

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(committed).toHaveTextContent('');
        expect(input).toHaveValue('');
    });

    it('preserves typing immediately after clicking Reset clears filters', () => {
        vi.useFakeTimers();
        const { input, committed } = renderHarness('/?search=budi');

        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
            fireEvent.change(input, { target: { value: 'x' } });
        });

        expect(input).toHaveValue('x');

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(input).toHaveValue('x');
        expect(committed).toHaveTextContent('x');
    });
});
