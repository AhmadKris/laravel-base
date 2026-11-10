import { afterEach, expect, it } from 'vitest';
import { formatDateTime, setDisplayTimeZone } from './format';

const UTC_MORNING = '2026-11-01T03:00:00Z';

afterEach(() => setDisplayTimeZone(undefined));

it('shows dates in the configured time zone', () => {
    setDisplayTimeZone('Asia/Jakarta');
    expect(formatDateTime(UTC_MORNING)).toBe('1 Nov 2026, 10.00');

    setDisplayTimeZone('Asia/Jayapura');
    expect(formatDateTime(UTC_MORNING)).toBe('1 Nov 2026, 12.00');
});

it('falls back to the browser zone for a zone the browser does not know', () => {
    setDisplayTimeZone('Mars/Base');

    expect(() => formatDateTime(UTC_MORNING)).not.toThrow();
});
