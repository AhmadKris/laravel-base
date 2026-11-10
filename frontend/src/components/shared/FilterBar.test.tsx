import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { FilterBar } from './FilterBar';

const desktopWidth = window.innerWidth;

function setWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

afterEach(() => setWidth(desktopWidth));

function renderBar(activeCount = 0) {
    render(
        <FilterBar activeCount={activeCount}>
            <button type="button">Filter modul</button>
        </FilterBar>,
    );
}

it('shows the filters in the row on larger screens', () => {
    renderBar(1);

    expect(screen.getByRole('button', { name: 'Filter modul' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Filter, / })).not.toBeInTheDocument();
});

describe('on a phone', () => {
    it('keeps the filters behind one button that counts the active ones', async () => {
        setWidth(375);
        renderBar(2);

        expect(screen.queryByRole('button', { name: 'Filter modul' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Filter, 2 aktif' }));

        const sheet = await screen.findByRole('dialog', { name: 'Filter, 2 aktif' });
        expect(within(sheet).getByRole('button', { name: 'Filter modul' })).toBeVisible();

        await userEvent.click(within(sheet).getByRole('button', { name: 'Tampilkan hasil' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('says plainly when no filter is active', () => {
        setWidth(375);
        renderBar(0);

        expect(screen.getByRole('button', { name: 'Filter' })).toBeVisible();
    });
});
