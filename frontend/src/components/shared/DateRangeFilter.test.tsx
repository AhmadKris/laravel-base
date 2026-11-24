import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DateRange } from '@/lib/date-range';
import { DateRangeFilter } from './DateRangeFilter';

const desktopWidth = window.innerWidth;

function setWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T03:00:00Z'));
});

afterEach(() => {
    vi.useRealTimers();
    setWidth(desktopWidth);
});

function renderFilter(value: DateRange = { preset: 'today' }) {
    const onChange = vi.fn<(range: DateRange) => void>();

    render(<DateRangeFilter value={value} onChange={onChange} timeZone="Asia/Jakarta" />);

    return onChange;
}

const day = (scope: HTMLElement, label: string) =>
    within(scope).getByRole('button', { name: new RegExp(`, ${label}`) });

describe('on a phone', () => {
    beforeEach(() => setWidth(375));

    it('opens a bottom sheet with the presets, the calendar and the apply button', async () => {
        renderFilter();

        await userEvent.click(screen.getByRole('button', { name: 'Rentang waktu: Hari ini' }));

        const sheet = await screen.findByRole('dialog', { name: 'Rentang waktu' });
        expect(sheet).toHaveAttribute('data-side', 'bottom');
        expect(within(sheet).getByRole('button', { name: 'Hari ini' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(within(sheet).getByRole('grid', { name: 'November 2026' })).toBeVisible();
        expect(within(sheet).getByRole('button', { name: 'Terapkan rentang' })).toBeVisible();
    });

    it('applies a preset and closes the sheet', async () => {
        const onChange = renderFilter();

        await userEvent.click(screen.getByRole('button', { name: /Rentang waktu/ }));
        const sheet = await screen.findByRole('dialog', { name: 'Rentang waktu' });
        await userEvent.click(within(sheet).getByRole('button', { name: '7 hari terakhir' }));

        expect(onChange).toHaveBeenCalledWith({ preset: '7d' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('applies a range picked on the calendar and describes the pick in the header', async () => {
        const onChange = renderFilter();

        await userEvent.click(screen.getByRole('button', { name: /Rentang waktu/ }));
        const sheet = await screen.findByRole('dialog', { name: 'Rentang waktu' });
        const apply = within(sheet).getByRole('button', { name: 'Terapkan rentang' });

        await userEvent.click(day(sheet, '3 November 2026'));
        expect(sheet).toHaveAccessibleDescription('Pilih tanggal akhir');
        expect(apply).toBeDisabled();

        await userEvent.click(day(sheet, '6 November 2026'));
        expect(sheet).toHaveAccessibleDescription('3 Nov 2026 sampai 6 Nov 2026');
        await userEvent.click(apply);

        expect(onChange).toHaveBeenCalledWith({
            preset: 'custom',
            from: '2026-11-03',
            to: '2026-11-06',
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('hides the days of other months', async () => {
        renderFilter();

        await userEvent.click(screen.getByRole('button', { name: /Rentang waktu/ }));
        const sheet = await screen.findByRole('dialog', { name: 'Rentang waktu' });

        expect(within(sheet).queryByRole('button', { name: /Oktober 2026/ })).toBeNull();
    });
});

it('keeps the popover on larger screens', async () => {
    renderFilter();

    await userEvent.click(screen.getByRole('button', { name: /Rentang waktu/ }));

    expect(await screen.findByRole('grid', { name: 'November 2026' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Rentang waktu' })).not.toBeInTheDocument();
});
