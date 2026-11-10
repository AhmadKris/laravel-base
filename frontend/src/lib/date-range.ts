export type DatePreset = 'today' | '7d' | '30d' | 'month' | 'all';

export type DateRange = { preset: DatePreset } | { preset: 'custom'; from: string; to: string };

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
    { value: 'today', label: 'Hari ini' },
    { value: '7d', label: '7 hari terakhir' },
    { value: '30d', label: '30 hari terakhir' },
    { value: 'month', label: 'Bulan ini' },
    { value: 'all', label: 'Semua waktu' },
];

const PRESET_DAYS: Record<Exclude<DatePreset, 'all' | 'month'>, number> = {
    today: 1,
    '7d': 7,
    '30d': 30,
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(value: string | null | undefined): value is string {
    return value !== null && value !== undefined && DATE_PATTERN.test(value);
}

/**
 * Today as YYYY-MM-DD in the given zone, or in the browser zone when none is given.
 */
export function todayIn(timeZone: string | undefined, now = new Date()): string {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

export function shiftDate(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * The UTC offset of the zone on that date, such as "+07:00".
 */
function offsetOn(date: string, timeZone: string | undefined): string {
    const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
        .formatToParts(new Date(`${date}T12:00:00Z`))
        .find((part) => part.type === 'timeZoneName')?.value;
    const offset = name?.replace('GMT', '') ?? '';

    return offset === '' ? '+00:00' : offset;
}

/**
 * The first and last day of the range, or undefined for "all time".
 */
export function rangeDays(
    range: DateRange,
    timeZone: string | undefined,
    now = new Date(),
): { from: string; to: string } | undefined {
    if (range.preset === 'custom') {
        return { from: range.from, to: range.to };
    }

    if (range.preset === 'all') {
        return undefined;
    }

    const today = todayIn(timeZone, now);

    if (range.preset === 'month') {
        return { from: `${today.slice(0, 8)}01`, to: today };
    }

    return { from: shiftDate(today, 1 - PRESET_DAYS[range.preset]), to: today };
}

/**
 * The API filter for the range: whole days in the company zone, sent with their offset.
 */
export function toApiRange(
    range: DateRange,
    timeZone: string | undefined,
    now = new Date(),
): { date_from?: string; date_to?: string } {
    const days = rangeDays(range, timeZone, now);

    if (days === undefined) {
        return {};
    }

    return {
        date_from: `${days.from}T00:00:00${offsetOn(days.from, timeZone)}`,
        date_to: `${days.to}T23:59:59${offsetOn(days.to, timeZone)}`,
    };
}

const dayFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' });

function formatDay(date: string): string {
    return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

export function rangeLabel(range: DateRange): string {
    if (range.preset !== 'custom') {
        return DATE_PRESETS.find((preset) => preset.value === range.preset)?.label ?? '';
    }

    return range.from === range.to
        ? formatDay(range.from)
        : `${formatDay(range.from)} sampai ${formatDay(range.to)}`;
}

/**
 * Reads the range from the URL. A preset is kept as its name, so a saved link to "today"
 * still means today when it is opened later.
 */
export function readDateRange(params: URLSearchParams, fallback: DatePreset): DateRange {
    const period = params.get('period');
    const preset = DATE_PRESETS.find((item) => item.value === period)?.value;

    if (preset !== undefined) {
        return { preset };
    }

    const from = params.get('date_from');
    const to = params.get('date_to');

    if (period === 'custom' && isDate(from) && isDate(to) && from <= to) {
        return { preset: 'custom', from, to };
    }

    return { preset: fallback };
}

export function dateRangeParams(
    range: DateRange,
    fallback: DatePreset,
): Record<'period' | 'date_from' | 'date_to', string | undefined> {
    if (range.preset === 'custom') {
        return { period: 'custom', date_from: range.from, date_to: range.to };
    }

    return {
        period: range.preset === fallback ? undefined : range.preset,
        date_from: undefined,
        date_to: undefined,
    };
}
