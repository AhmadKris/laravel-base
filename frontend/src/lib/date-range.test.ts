import { describe, expect, it } from 'vitest';
import { dateRangeParams, rangeLabel, readDateRange, toApiRange } from './date-range';

// 03:00 UTC is 10:00 in Jakarta and still the previous evening in New York.
const NOW = new Date('2026-11-10T03:00:00Z');

describe('toApiRange', () => {
    it('sends whole days in the company zone with their offset', () => {
        expect(toApiRange({ preset: 'today' }, 'Asia/Jakarta', NOW)).toEqual({
            date_from: '2026-11-10T00:00:00+07:00',
            date_to: '2026-11-10T23:59:59+07:00',
        });
    });

    it('counts today as part of the last 7 and 30 days', () => {
        expect(toApiRange({ preset: '7d' }, 'Asia/Jakarta', NOW).date_from).toBe(
            '2026-11-04T00:00:00+07:00',
        );
        expect(toApiRange({ preset: '30d' }, 'Asia/Jakarta', NOW).date_from).toBe(
            '2026-10-12T00:00:00+07:00',
        );
    });

    it('uses the date of today in that zone, not in UTC', () => {
        expect(toApiRange({ preset: 'today' }, 'America/New_York', NOW)).toEqual({
            date_from: '2026-11-09T00:00:00-05:00',
            date_to: '2026-11-09T23:59:59-05:00',
        });
    });

    it('writes a zero offset for UTC', () => {
        expect(toApiRange({ preset: 'today' }, 'UTC', NOW).date_from).toBe(
            '2026-11-10T00:00:00+00:00',
        );
    });

    it('starts this month on its first day in the company zone', () => {
        expect(toApiRange({ preset: 'month' }, 'Asia/Jakarta', NOW)).toEqual({
            date_from: '2026-11-01T00:00:00+07:00',
            date_to: '2026-11-10T23:59:59+07:00',
        });
        // 1 December 03:00 UTC is still 30 November in New York.
        expect(
            toApiRange({ preset: 'month' }, 'America/New_York', new Date('2026-12-01T03:00:00Z'))
                .date_from,
        ).toBe('2026-11-01T00:00:00-05:00');
    });

    it('sends nothing for all time', () => {
        expect(toApiRange({ preset: 'all' }, 'Asia/Jakarta', NOW)).toEqual({});
    });

    it('sends a custom range as given', () => {
        expect(
            toApiRange({ preset: 'custom', from: '2026-11-01', to: '2026-11-03' }, 'Asia/Jakarta'),
        ).toEqual({
            date_from: '2026-11-01T00:00:00+07:00',
            date_to: '2026-11-03T23:59:59+07:00',
        });
    });
});

describe('rangeLabel', () => {
    it('names presets and custom ranges', () => {
        expect(rangeLabel({ preset: '7d' })).toBe('7 hari terakhir');
        expect(rangeLabel({ preset: 'custom', from: '2026-11-01', to: '2026-11-03' })).toBe(
            '1 Nov 2026 sampai 3 Nov 2026',
        );
        expect(rangeLabel({ preset: 'custom', from: '2026-11-01', to: '2026-11-01' })).toBe(
            '1 Nov 2026',
        );
    });
});

describe('the range in the URL', () => {
    it('falls back to the default for a missing, unknown, or reversed range', () => {
        expect(readDateRange(new URLSearchParams(), 'today')).toEqual({ preset: 'today' });
        expect(readDateRange(new URLSearchParams('period=yearly'), 'today')).toEqual({
            preset: 'today',
        });
        expect(
            readDateRange(
                new URLSearchParams('period=custom&date_from=2026-11-05&date_to=2026-11-01'),
                'today',
            ),
        ).toEqual({ preset: 'today' });
    });

    it('reads what it writes', () => {
        const custom = { preset: 'custom', from: '2026-11-01', to: '2026-11-03' } as const;
        const write = (range: Parameters<typeof dateRangeParams>[0]) =>
            new URLSearchParams(
                Object.entries(dateRangeParams(range, 'today')).filter(
                    (entry): entry is [string, string] => entry[1] !== undefined,
                ),
            );

        expect(readDateRange(write(custom), 'today')).toEqual(custom);
        expect(readDateRange(write({ preset: '30d' }), 'today')).toEqual({ preset: '30d' });
        expect(write({ preset: 'today' }).toString()).toBe('');
    });
});
